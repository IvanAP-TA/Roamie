/**
 * Server-side HTML for /p/:slug (see api/public-trip.ts). Link previews and crawlers get the trip's own
 * title, description, image and content; the client app then renders the page normally.
 * Files starting with "_" are not deployed as functions.
 */

export const SITE_URL = 'https://roamie.org'

export interface PublicTripSummary {
  slug: string
  name: string
  description: string | null
  cover_image_url: string | null
  destinations: { name: string; country: string | null; image_url: string | null }[]
  days: { day_number: number; title: string | null; items: { time: string | null; title: string; place_name: string | null }[] }[]
}

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ENTITIES[c])

const isWikimediaImage = (url: string | null): url is string => !!url && /^https:\/\/(upload|thumb)\.wikimedia\.org\/[^\s"'<>]+$/.test(url)

export function publicTripMeta(trip: PublicTripSummary) {
  const names = trip.destinations.slice(0, 6).map((d) => d.name)
  const description = (trip.description?.trim() || (names.length ? names.join(' · ') : 'Roamie')).slice(0, 200)
  return {
    title: `${trip.name} · Roamie`,
    description,
    url: `${SITE_URL}/p/${trip.slug}`,
    image: [trip.cover_image_url, ...trip.destinations.map((d) => d.image_url)].find(isWikimediaImage) ?? null,
  }
}

/** Visually hidden: the same content React renders a moment later, for crawlers that don't run scripts. */
function staticContent(trip: PublicTripSummary): string {
  const e = escapeHtml
  const destinations = trip.destinations.map((d) => `<li>${e(d.name)}${d.country ? `, ${e(d.country)}` : ''}</li>`).join('')
  const days = trip.days
    .map((day) => {
      const items = day.items
        .map((i) => `<li>${i.time ? `${e(i.time)} ` : ''}${e(i.title)}${i.place_name ? ` (${e(i.place_name)})` : ''}</li>`)
        .join('')
      return `<li>${day.title ? e(day.title) : ''}${items ? `<ul>${items}</ul>` : ''}</li>`
    })
    .join('')
  return [
    `<main class="sr-only">`,
    `<h1>${e(trip.name)}</h1>`,
    trip.description ? `<p>${e(trip.description)}</p>` : '',
    destinations ? `<ul>${destinations}</ul>` : '',
    days ? `<ol>${days}</ol>` : '',
    `</main>`,
  ].join('')
}

/** Swaps the app shell's generic, noindex head for the trip's own. A missing trip leaves the shell as is. */
export function renderPublicTripPage(shell: string, trip: PublicTripSummary | null): string {
  if (!trip) return shell
  const e = escapeHtml
  const meta = publicTripMeta(trip)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: trip.name,
    description: meta.description,
    url: meta.url,
    ...(meta.image && { image: meta.image }),
    itinerary: {
      '@type': 'ItemList',
      itemListElement: trip.destinations.map((d, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: { '@type': 'Place', name: d.name, ...(d.country && { address: d.country }) },
      })),
    },
  }

  const head = [
    `<title>${e(meta.title)}</title>`,
    `<meta name="description" content="${e(meta.description)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<link rel="canonical" href="${e(meta.url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Roamie" />`,
    `<meta property="og:title" content="${e(trip.name)}" />`,
    `<meta property="og:description" content="${e(meta.description)}" />`,
    `<meta property="og:url" content="${e(meta.url)}" />`,
    meta.image
      ? `<meta property="og:image" content="${e(meta.image)}" />`
      : [
          `<meta property="og:image" content="${SITE_URL}/og/it.png" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
        ].join('\n    '),
    `<meta name="twitter:card" content="summary_large_image" />`,
    // Escape "<" so no string inside the JSON can close the script element.
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ')

  return shell
    .replace(/<!--[\s\S]*?-->\s*/g, '')
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(/<meta\s+(?:name="(?:description|robots|twitter:[^"]*)"|property="og:[^"]*")[^>]*>\s*/g, '')
    .replace('</head>', () => `  ${head}\n  </head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${staticContent(trip)}</div>`)
}
