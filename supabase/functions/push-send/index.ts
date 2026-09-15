/**
 * push-send: delivers the notifications queued in public.push_outbox.
 *
 * - Called by the database (pg_net) right after rows are queued, with an empty body: drains the outbox.
 * - Called by the app with { action: 'public-key' }: returns the VAPID public key browsers subscribe with.
 *
 * Neither call reveals or changes anything a caller could abuse, so the function accepts calls without a JWT;
 * database access goes through the service role and RPCs only it may run.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { renderPush, type PushData, type PushKind } from './messages.ts'
import { generateVapidKeys, importVapidKeys, sendPush, type StoredVapidKeys, type VapidKeys } from './webpush.ts'

const CONTACT = 'mailto:nk1530htu@mozmail.com'
const BATCH = 200
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

interface OutboxRow {
  outbox_id: number
  kind: PushKind
  data: PushData
  trip_id: string | null
  trip_name: string | null
  endpoint: string
  p256dh: string
  auth: string
  lang: string
}

let vapid: Promise<VapidKeys> | null = null

/** The key pair from Vault, created on first use. */
function vapidKeys(): Promise<VapidKeys> {
  vapid ??= (async () => {
    const { data: stored, error } = await admin.rpc('push_vapid_keys')
    if (error) throw error
    if (stored) return importVapidKeys(stored as StoredVapidKeys)
    // Two first calls racing: the database keeps the pair stored first and returns it to both.
    const { data: saved, error: saveError } = await admin.rpc('push_store_vapid_keys', { p_keys: await generateVapidKeys() })
    if (saveError) throw saveError
    return importVapidKeys(saved as StoredVapidKeys)
  })().catch((error) => {
    vapid = null
    throw error
  })
  return vapid
}

async function drain() {
  const keys = await vapidKeys()
  let sent = 0
  let failed = 0
  const gone = new Set<string>()

  // A few rounds at most: anything queued meanwhile triggers another call.
  for (let round = 0; round < 10; round++) {
    const { data, error } = await admin.rpc('claim_push_batch', { p_limit: BATCH })
    if (error) throw error
    const rows = (data ?? []) as OutboxRow[]
    if (rows.length === 0) break

    await Promise.all(
      rows.map(async (row) => {
        const message = renderPush(row.kind, row.lang, row.data, row.trip_id, row.trip_name)
        try {
          const status = await sendPush(row, JSON.stringify(message), keys, CONTACT)
          if (status === 404 || status === 410) gone.add(row.endpoint)
          else if (status >= 200 && status < 300) sent++
          else {
            failed++
            console.warn(`push service answered ${status} for ${new URL(row.endpoint).host}`)
          }
        } catch (error) {
          failed++
          console.warn('push failed', error)
        }
      }),
    )
  }

  // The browser dropped these subscriptions (notifications turned off, app uninstalled…).
  if (gone.size > 0) await admin.from('push_subscriptions').delete().in('endpoint', [...gone])
  return { sent, failed, removed: gone.size }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const body = await req.json().catch(() => ({}))
    if (body?.action === 'public-key') {
      const { publicKey } = await vapidKeys()
      return Response.json({ publicKey }, { headers: CORS })
    }
    return Response.json(await drain(), { headers: CORS })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'push_failed' }, { status: 500, headers: CORS })
  }
})
