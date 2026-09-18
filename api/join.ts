import { INVITE_CODE, pickLang, renderInvitePage, type InviteCard } from './_invite.js'

/**
 * GET /join/:code (rewritten here by vercel.json): the app shell with the invite's own preview, so the link shows the
 * trip in WhatsApp and friends. The app then renders the invite page as usual.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const code = (url.searchParams.get('code') ?? '').toUpperCase()
  const lang = pickLang(url.searchParams.get('lang') ?? request.headers.get('accept-language'))

  const shellResponse = await fetch(new URL('/shell', url.origin))
  if (!shellResponse.ok) return new Response('Service unavailable', { status: 503 })
  const shell = await shellResponse.text()
  const html = (body: string, cache: string) =>
    new Response(body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache, Vary: 'Accept-Language' } })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  // The app shows its own message for a wrong code.
  if (!INVITE_CODE.test(code) || !supabaseUrl || !supabaseKey) return html(shell, 'no-store')

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_invite_card`, {
      method: 'POST',
      headers: { apikey: supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: code }),
      signal: AbortSignal.timeout(4000),
    })
    if (!response.ok) return html(shell, 'no-store')
    const card = (await response.json()) as InviteCard | null
    // Short CDN cache: a regenerated code stops showing the trip within minutes.
    return html(renderInvitePage(shell, card, code, lang), 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
  } catch {
    return html(shell, 'no-store')
  }
}
