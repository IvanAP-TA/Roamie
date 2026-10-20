/**
 * funnel-report: the weekly numbers (public.funnel_report(): counts only), for the report the bot sends to Telegram
 * every Monday (video/automation/report.mjs).
 *
 * GET with the x-report-secret header. Only the bot knows the secret: it's SOCIAL_UPLOAD_SECRET, the one the bot
 * already shares with the social-media function (an Edge Function secret and a GitHub secret with the same value).
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  const secret = Deno.env.get('SOCIAL_UPLOAD_SECRET')
  if (!secret || req.headers.get('x-report-secret') !== secret) return json(401, { error: 'unauthorized' })
  if (req.method !== 'GET') return json(405, { error: 'method' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.rpc('funnel_report')
  if (error) {
    console.error('funnel_report', error.message)
    return json(500, { error: 'failed' })
  }
  return json(200, data)
})
