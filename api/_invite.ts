/**
 * Invite links (/join/:code): link previews show the trip itself — its name, who's in and what they're choosing
 * between — instead of the generic Roamie card. Used by api/join.ts (the page) and api/og/invite.ts (the image).
 * Files starting with "_" are not deployed as functions.
 */

export const SITE_URL = 'https://roamie.org'

/** Invite codes: 8 characters from an alphabet without look-alikes (see generate_invite_code in SQL). */
export const INVITE_CODE = /^[A-Z0-9]{8}$/

export type Lang = 'it' | 'en' | 'es'

/** get_invite_card: what anyone holding the code may see, and nothing more. */
export interface InviteCard {
  name: string
  cover_image_url: string | null
  member_count: number
  destination_count: number
  destinations: { name: string; image_url: string | null }[]
}

/** From ?lang= or Accept-Language ("en-GB,en;q=0.9"): link-preview crawlers rarely send one, so Italian by default. */
export function pickLang(value: string | null | undefined): Lang {
  const code = (value ?? '').trim().slice(0, 2).toLowerCase()
  return code === 'en' || code === 'es' ? code : 'it'
}

const TEXT: Record<
  Lang,
  {
    eyebrow: string
    title: (name: string) => string
    members: (n: number) => string
    places: (n: number) => string
    choosing: (names: string) => string
    pitch: string
    cta: string
    and: string
  }
> = {
  it: {
    eyebrow: 'Sei invitato a',
    title: (name) => `Unisciti a «${name}» su Roamie`,
    members: (n) => (n === 1 ? '1 viaggiatore' : `${n} viaggiatori`),
    places: (n) => (n === 1 ? '1 meta in gara' : `${n} mete in gara`),
    choosing: (names) => `Si sceglie tra ${names}.`,
    pitch: 'Entri con il solo nome e voti dal telefono, senza app né account.',
    cta: 'Unisciti al viaggio',
    and: 'e',
  },
  en: {
    eyebrow: "You're invited to",
    title: (name) => `Join “${name}” on Roamie`,
    members: (n) => (n === 1 ? '1 traveller' : `${n} travellers`),
    places: (n) => (n === 1 ? '1 place in the running' : `${n} places in the running`),
    choosing: (names) => `Choosing between ${names}.`,
    pitch: 'Join with just your name and vote from your phone, no app or account needed.',
    cta: 'Join the trip',
    and: 'and',
  },
  es: {
    eyebrow: 'Te invitan a',
    title: (name) => `Únete a «${name}» en Roamie`,
    members: (n) => (n === 1 ? '1 viajero' : `${n} viajeros`),
    places: (n) => (n === 1 ? '1 destino en juego' : `${n} destinos en juego`),
    choosing: (names) => `Se elige entre ${names}.`,
    pitch: 'Entras solo con tu nombre y votas desde el móvil, sin app ni cuenta.',
    cta: 'Únete al viaje',
    and: 'y',
  },
}

const listOf = (names: string[], and: string) =>
  names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`

export function inviteMeta(card: InviteCard, code: string, lang: Lang) {
  const t = TEXT[lang]
  const names = card.destinations.map((d) => d.name)
  const summary = [t.members(card.member_count), card.destination_count > 0 ? t.places(card.destination_count) : null].filter(Boolean).join(' · ')
  // Changes when the trip does, so apps holding an old preview fetch the new image.
  const version = `${card.member_count}.${card.destination_count}.${encodeURIComponent(names.join('|')).length}`
  return {
    title: t.title(card.name),
    description: `${summary}. ${names.length ? `${t.choosing(listOf(names, t.and))} ` : ''}${t.pitch}`.slice(0, 200),
    url: `${SITE_URL}/join/${code}`,
    image: `${SITE_URL}/api/og/invite?code=${code}&lang=${lang}&v=${version}`,
  }
}

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ENTITIES[c])

/** Swaps the app shell's generic preview for the trip's own. The page stays out of search engines. */
export function renderInvitePage(shell: string, card: InviteCard | null, code: string, lang: Lang): string {
  if (!card) return shell
  const e = escapeHtml
  const meta = inviteMeta(card, code, lang)
  const head = [
    `<title>${e(meta.title)}</title>`,
    `<meta name="description" content="${e(meta.description)}" />`,
    `<meta name="robots" content="noindex, follow" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Roamie" />`,
    `<meta property="og:title" content="${e(meta.title)}" />`,
    `<meta property="og:description" content="${e(meta.description)}" />`,
    `<meta property="og:url" content="${e(meta.url)}" />`,
    `<meta property="og:image" content="${e(meta.image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${e(meta.title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ')

  return shell
    .replace(/<!--[\s\S]*?-->\s*/g, '')
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(/<meta\s+(?:name="(?:description|robots|twitter:[^"]*)"|property="og:[^"]*")[^>]*>\s*/g, '')
    .replace('</head>', () => `  ${head}\n  </head>`)
}

// ── The preview image (rendered by @vercel/og) ──

type Child = ImageNode | string | null | false | undefined
export interface ImageNode {
  type: string
  props: Record<string, unknown>
}

const el = (style: Record<string, unknown>, ...children: Child[]): ImageNode => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children: children.filter((c): c is ImageNode | string => Boolean(c)) },
})
const img = (src: string, style: Record<string, unknown>): ImageNode => ({ type: 'img', props: { src, style } })

const INK = '#2b1d17'
const MUTED = '#7a6053'
const PRIMARY = '#c24e27'
const WARM = 'linear-gradient(135deg, #ff7a5c 0%, #c24e27 100%)'

const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)

/**
 * 1200×630: the trip's photo on the left; name, people and the places in the running on the right. Photos arrive as
 * data URIs (fetched by the caller), so rendering never depends on another site answering.
 */
export function inviteImage(card: InviteCard, lang: Lang, photos: { cover: string | null; destinations: (string | null)[] }): ImageNode {
  const t = TEXT[lang]
  const photo = photos.cover ?? photos.destinations.find(Boolean) ?? null
  const name = cut(card.name, 60)
  const titleSize = name.length > 34 ? 56 : name.length > 20 ? 66 : 78
  const summary = [t.members(card.member_count), card.destination_count > 0 ? t.places(card.destination_count) : null].filter(Boolean).join(' · ')

  const picture = el(
    {
      width: 460,
      height: 550,
      flexShrink: 0,
      borderRadius: 44,
      overflow: 'hidden',
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: 'linear-gradient(160deg, #ff8e6b 0%, #d9572c 55%, #8e3a4c 100%)',
      boxShadow: '0 30px 60px rgba(150, 70, 30, 0.28)',
    },
    photo
      ? img(photo, { width: 460, height: 550, objectFit: 'cover' })
      : el({ width: 220, height: 220, borderRadius: 999, backgroundImage: 'linear-gradient(180deg, #ffe7b8 0%, #f7b267 100%)' }),
  )

  const chips = card.destinations.slice(0, 3).map((d, i) =>
    el(
      {
        alignItems: 'center',
        padding: '8px 22px 8px 8px',
        marginRight: 12,
        marginBottom: 12,
        borderRadius: 999,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        fontFamily: 'Instrument Sans',
        fontWeight: 600,
        fontSize: 26,
        color: INK,
      },
      photos.destinations[i]
        ? img(photos.destinations[i]!, { width: 46, height: 46, borderRadius: 999, objectFit: 'cover', marginRight: 12 })
        : el({ width: 46, height: 46, borderRadius: 999, backgroundImage: WARM, marginRight: 12 }),
      cut(d.name, 20),
    ),
  )

  const text = el(
    { flexDirection: 'column', width: 604, height: 550, marginLeft: 56, justifyContent: 'space-between' },
    el(
      { flexDirection: 'column' },
      el({ fontFamily: 'Instrument Sans', fontWeight: 600, fontSize: 24, letterSpacing: 4, color: PRIMARY, textTransform: 'uppercase' }, t.eyebrow),
      el({ marginTop: 14, fontFamily: 'Fraunces', fontWeight: 600, fontSize: titleSize, lineHeight: 1.06, color: INK }, name),
      el({ marginTop: 20, fontFamily: 'Instrument Sans', fontWeight: 400, fontSize: 28, color: MUTED }, summary),
      chips.length > 0 && el({ flexWrap: 'wrap', marginTop: 28 }, ...chips),
    ),
    el(
      { alignItems: 'center', justifyContent: 'space-between' },
      el(
        { alignItems: 'center' },
        el({ width: 52, height: 52, borderRadius: 16, backgroundImage: 'linear-gradient(160deg, #ff8e6b 0%, #d9572c 55%, #8e3a4c 100%)', marginRight: 14, alignItems: 'flex-end', justifyContent: 'center' },
          el({ width: 30, height: 30, borderRadius: 999, marginBottom: 6, backgroundImage: 'linear-gradient(180deg, #ffe7b8 0%, #f7b267 100%)' }),
        ),
        el({ fontFamily: 'Fraunces', fontWeight: 600, fontSize: 40, color: INK }, 'roamie'),
      ),
      el({ padding: '16px 32px', borderRadius: 999, backgroundImage: WARM, color: '#fff8f2', fontFamily: 'Instrument Sans', fontWeight: 600, fontSize: 28 }, t.cta),
    ),
  )

  return el({ width: 1200, height: 630, padding: 40, alignItems: 'center', backgroundImage: 'linear-gradient(135deg, #fbf4ec 0%, #ffe2cf 100%)' }, picture, text)
}
