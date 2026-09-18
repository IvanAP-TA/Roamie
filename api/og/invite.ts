import { ImageResponse } from '@vercel/og'
import sharp from 'sharp'
import { INVITE_CODE, inviteImage, pickLang, SITE_URL, type InviteCard } from '../_invite.js'

/**
 * GET /api/og/invite?code=…&lang=…: the 1200×630 preview image of an invite link (see api/_invite.ts). Anything
 * unexpected falls back to the generic Roamie image.
 */

const FONTS: { name: string; weight: 400 | 600; file: string }[] = [
  { name: 'Fraunces', weight: 600, file: 'fraunces-latin-600-normal.woff' },
  { name: 'Fraunces', weight: 600, file: 'fraunces-latin-ext-600-normal.woff' },
  { name: 'Instrument Sans', weight: 400, file: 'instrument-sans-latin-400-normal.woff' },
  { name: 'Instrument Sans', weight: 400, file: 'instrument-sans-latin-ext-400-normal.woff' },
  { name: 'Instrument Sans', weight: 600, file: 'instrument-sans-latin-600-normal.woff' },
  { name: 'Instrument Sans', weight: 600, file: 'instrument-sans-latin-ext-600-normal.woff' },
]

const WIKIMEDIA = /^https:\/\/(upload|thumb)\.wikimedia\.org\/[^\s'"\\<>]+$/

/** A Commons photo as a data URI, at a small standard width; null if it can't be fetched quickly. */
async function photo(url: string | null, width: 330 | 500 | 960): Promise<string | null> {
  if (!url || !WIKIMEDIA.test(url)) return null
  const sized = url.includes('/thumb/') ? url.replace(/\/\d+px-([^/]+)$/, `/${width}px-$1`) : url
  try {
    const response = await fetch(sized, {
      headers: { 'User-Agent': `Roamie/1.0 (${SITE_URL})` },
      signal: AbortSignal.timeout(3000),
    })
    const type = response.headers.get('content-type') ?? ''
    if (!response.ok || !/^image\/(jpeg|png|webp)/.test(type)) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    return bytes.length > 2_000_000 ? null : `data:${type.split(';')[0]};base64,${bytes.toString('base64')}`
  } catch {
    return null
  }
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const code = (url.searchParams.get('code') ?? '').toUpperCase()
  const lang = pickLang(url.searchParams.get('lang'))
  const fallback = () => Response.redirect(`${SITE_URL}/og/${lang}.png`, 302)

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!INVITE_CODE.test(code) || !supabaseUrl || !supabaseKey) return fallback()

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_invite_card`, {
      method: 'POST',
      headers: { apikey: supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: code }),
      signal: AbortSignal.timeout(4000),
    })
    const card = response.ok ? ((await response.json()) as InviteCard | null) : null
    if (!card) return fallback()

    const [fonts, cover, ...destinations] = await Promise.all([
      Promise.all(
        FONTS.map(async (font) => {
          const file = await fetch(new URL(`/og-fonts/${font.file}`, url.origin))
          if (!file.ok) throw new Error(`font ${font.file}: ${file.status}`)
          return { name: font.name, weight: font.weight, style: 'normal' as const, data: await file.arrayBuffer() }
        }),
      ),
      photo(card.cover_image_url, 960),
      ...card.destinations.slice(0, 3).map((d) => photo(d.image_url, 330)),
    ])

    const png = await new ImageResponse(inviteImage(card, lang, { cover, destinations }) as never, { width: 1200, height: 630, fonts }).arrayBuffer()
    // As a PNG, a photo makes the image several hundred KB, and WhatsApp skips previews much above 300 KB.
    const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 80, mozjpeg: true }).toBuffer()
    return new Response(new Uint8Array(jpeg), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
  } catch (error) {
    console.error(error)
    return fallback()
  }
}
