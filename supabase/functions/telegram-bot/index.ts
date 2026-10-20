/**
 * telegram-bot: Roamie in a Telegram group (migration 20261020200000_telegram_groups.sql).
 *
 * - POST from Telegram (the webhook, with its secret header): the commands /collega <code> (also /link, /vincular, and
 *   /start <code> when the bot is added with t.me/<bot>?startgroup=<code>), /mete, /scollega, /aiuto. In groups the
 *   bot only receives commands (Telegram's privacy mode): it never reads the chat.
 * - POST {"drain": true} from the database: sends what telegram_outbox holds (places proposed, people joining, the
 *   wheel's pick, dates fixed) to the linked groups.
 * - GET ?setup: points Telegram's webhook here and sets the command menu (harmless to repeat).
 *
 * Needs the Edge Function secret TELEGRAM_GROUP_BOT_TOKEN (the bot made with @BotFather); without it, it does nothing.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { COMMANDS, eventMessage, inviteCode, langOf, parseCommand, placesMessage, text, type EventKind, type Lang } from './messages.ts'

const TOKEN = Deno.env.get('TELEGRAM_GROUP_BOT_TOKEN') ?? ''
const SITE = 'https://roamie.org'
const SELF = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-bot`

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const ok = () => new Response('ok')
const joinLink = (code: string) => `${SITE}/join/${code}`

/** The webhook's secret, derived from the token: Telegram sends it back in a header with every update. */
async function webhookSecret() {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`roamie-webhook:${TOKEN}`))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 48)
}

async function telegram(method: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: response.status, data: await response.json().catch(() => null) }
}

const send = (chatId: number, html: string, preview = false) =>
  telegram('sendMessage', { chat_id: chatId, text: html, parse_mode: 'HTML', link_preview_options: { is_disabled: !preview } })

// ── The queue from the database ──

async function drain() {
  for (let round = 0; round < 5; round++) {
    const { data: batch, error } = await admin.rpc('claim_telegram_batch', { p_limit: 50 })
    if (error) {
      console.error('claim_telegram_batch', error.message)
      return
    }
    if (!batch?.length) return
    for (const m of batch as { chat_id: number; kind: EventKind; data: Record<string, string>; trip_name: string; invite_code: string; lang: Lang }[]) {
      const result = await send(m.chat_id, eventMessage(m.kind, m.data, m.trip_name, joinLink(m.invite_code), m.lang))
      // The bot was removed from the group, or the group is gone: stop writing to it.
      if (result.status === 403 || (result.status === 400 && /chat not found/i.test(result.data?.description ?? ''))) {
        await admin.from('telegram_chats').delete().eq('chat_id', m.chat_id)
      }
    }
  }
}

// ── Commands ──

interface Message {
  chat: { id: number; type: string }
  from?: { language_code?: string }
  text?: string
  new_chat_members?: { username?: string; is_bot?: boolean }[]
  migrate_to_chat_id?: number
}

async function linkedTrip(chatId: number) {
  const { data } = await admin.from('telegram_chats').select('trip_id, lang, trips(name, invite_code, secret_voting, votes_revealed_at)').eq('chat_id', chatId).maybeSingle()
  return data as { trip_id: string; lang: Lang; trips: { name: string; invite_code: string; secret_voting: boolean; votes_revealed_at: string | null } } | null
}

async function handle(message: Message) {
  const chatId = message.chat.id
  const group = message.chat.type === 'group' || message.chat.type === 'supergroup'
  const lang = langOf(message.from?.language_code)
  const t = text(lang)

  // A group that becomes a supergroup changes id: keep the link.
  if (message.migrate_to_chat_id) {
    await admin.from('telegram_chats').update({ chat_id: message.migrate_to_chat_id }).eq('chat_id', chatId)
    return
  }
  // Added to a group: say what to do (unless a /start <code> follows, which links straight away).
  if (message.new_chat_members?.some((m) => m.is_bot && m.username === BOT_USERNAME)) {
    if (!(await linkedTrip(chatId))) await send(chatId, t.welcome)
    return
  }

  const parsed = parseCommand(message.text ?? '')
  if (!parsed) return
  const { command, arg } = parsed

  if (!group) {
    if ([...COMMANDS.link, ...COMMANDS.help].includes(command)) await send(chatId, t.private)
    return
  }

  if (COMMANDS.link.includes(command)) {
    const code = inviteCode(arg)
    if (!code) {
      // A bare /start (the group was opened from a plain t.me link) gets the welcome instead.
      await send(chatId, command === 'start' ? t.welcome : t.needCode)
      return
    }
    const { data: trip } = await admin.from('trips').select('id, name, invite_code').eq('invite_code', code).maybeSingle()
    if (!trip) {
      await send(chatId, t.badCode)
      return
    }
    await admin.from('telegram_chats').upsert({ chat_id: chatId, trip_id: trip.id, lang, linked_at: new Date().toISOString() })
    await send(chatId, `${t.linked(trip.name.replace(/[<>&]/g, ''))}\n${joinLink(trip.invite_code)}`, true)
    return
  }

  if (COMMANDS.unlink.includes(command)) {
    await admin.from('telegram_chats').delete().eq('chat_id', chatId)
    await send(chatId, t.unlinked)
    return
  }

  if (COMMANDS.places.includes(command)) {
    const linked = await linkedTrip(chatId)
    if (!linked) {
      await send(chatId, t.notLinked)
      return
    }
    const { data: rows } = await admin.from('destinations').select('name, votes(points)').eq('trip_id', linked.trip_id).eq('status', 'proposed')
    const places = (rows ?? []).map((d: { name: string; votes: { points: number }[] }) => ({ name: d.name, points: d.votes.reduce((sum, v) => sum + v.points, 0) }))
    const secret = linked.trips.secret_voting && !linked.trips.votes_revealed_at
    await send(chatId, placesMessage(linked.trips.name, places, secret, joinLink(linked.trips.invite_code), linked.lang))
    return
  }

  if (COMMANDS.help.includes(command)) {
    await send(chatId, (await linkedTrip(chatId)) ? t.welcome.split('\n\n')[0] + '\n\n/mete · /scollega' : t.welcome)
  }
}

// ── Setup ──

let BOT_USERNAME = Deno.env.get('TELEGRAM_GROUP_BOT_USERNAME') ?? ''

async function setup() {
  const me = await telegram('getMe', {})
  const secret = await webhookSecret()
  const hook = await telegram('setWebhook', { url: SELF, secret_token: secret, allowed_updates: ['message'] })
  for (const [lang, list] of [
    ['it', [['mete', 'Le mete e i punti'], ['collega', 'Collega il gruppo a un viaggio (codice d’invito)'], ['scollega', 'Scollega il gruppo'], ['aiuto', 'Come funziona']]],
    ['en', [['places', 'The places and their points'], ['link', 'Link the group to a trip (invite code)'], ['unlink', 'Unlink the group'], ['help', 'How it works']]],
    ['es', [['destinos', 'Los destinos y sus puntos'], ['vincular', 'Vincula el grupo a un viaje (código)'], ['desvincular', 'Desvincula el grupo'], ['ayuda', 'Cómo funciona']]],
  ] as const) {
    await telegram('setMyCommands', { commands: list.map(([command, description]) => ({ command, description })), language_code: lang })
  }
  // The Italian menu is also the default, for groups in other languages.
  await telegram('setMyCommands', { commands: [['mete', 'Le mete e i punti'], ['collega', 'Collega il gruppo a un viaggio'], ['scollega', 'Scollega il gruppo']].map(([command, description]) => ({ command, description })) })
  return { bot: me.data?.result?.username ?? null, webhook: hook.data?.ok ?? false }
}

Deno.serve(async (req) => {
  if (!TOKEN) return new Response('not configured', { status: 503 })
  const url = new URL(req.url)

  if (req.method === 'GET' && url.searchParams.has('setup')) return Response.json(await setup())
  if (req.method !== 'POST') return new Response('method', { status: 405 })

  const telegramSecret = req.headers.get('x-telegram-bot-api-secret-token')
  if (!telegramSecret) {
    // The database's call: nothing in it but the order to send what's queued.
    const body = await req.json().catch(() => null)
    if (body?.drain) await drain()
    return ok()
  }
  if (telegramSecret !== (await webhookSecret())) return new Response('forbidden', { status: 403 })

  if (!BOT_USERNAME) BOT_USERNAME = (await telegram('getMe', {})).data?.result?.username ?? ''
  const update = await req.json().catch(() => null)
  try {
    if (update?.message) await handle(update.message)
  } catch (error) {
    console.error('update', (error as Error).message)
  }
  // Always 200: Telegram would otherwise retry the same update again and again.
  return ok()
})
