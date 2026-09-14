import { renderPublicTripPage, type PublicTripSummary } from './_public-trip-html.js'

/**
 * GET /p/:slug (rewritten here by vercel.json): the app shell with the public trip's meta tags, so
 * WhatsApp, social networks and search engines show the trip itself. The app loads the data again client-side.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const slug = (url.searchParams.get('slug') ?? '').trim().toLowerCase()

  const shellResponse = await fetch(new URL('/shell', url.origin))
  if (!shellResponse.ok) return new Response('Service unavailable', { status: 503 })
  const shell = await shellResponse.text()

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  const html = (body: string, status: number, cache: string) =>
    new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache } })

  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return html(shell, 404, 'public, max-age=0, s-maxage=300')
  // Without the data the client still renders the page; only the previews fall back to the generic ones.
  if (!supabaseUrl || !supabaseKey) return html(shell, 200, 'no-store')

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_trip`, {
      method: 'POST',
      headers: { apikey: supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_slug: slug }),
      signal: AbortSignal.timeout(4000),
    })
    if (!response.ok) return html(shell, 200, 'no-store')
    const trip = (await response.json()) as PublicTripSummary | null
    // Short CDN cache: unpublishing takes the previews down within a minute.
    return html(renderPublicTripPage(shell, trip), trip ? 200 : 404, 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
  } catch {
    return html(shell, 200, 'no-store')
  }
}
