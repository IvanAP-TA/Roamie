import { describe, expect, it } from 'vitest'
import { renderPublicTripPage, type PublicTripSummary } from './_public-trip-html.js'

const SHELL = `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <!-- App shell: never indexed. -->
    <title>Roamie</title>
    <meta name="description" content="Generic" />
    <meta name="robots" content="noindex, follow" />
    <meta property="og:title" content="Roamie" />
    <meta property="og:image" content="https://roamie.org/og/it.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="module" crossorigin src="/assets/shell-abc.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`

const trip: PublicTripSummary = {
  slug: 'lisbona-k3m9x2ab',
  name: 'Lisbona & <amici>',
  description: null,
  cover_image_url: null,
  destinations: [
    { name: 'Porto "vecchia"', country: 'Portugal', image_url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Porto.jpg' },
    { name: 'Sintra', country: null, image_url: null },
  ],
  days: [{ day_number: 1, title: 'Arrivo', items: [{ time: '10:00', title: 'Tram 28', place_name: 'Alfama' }] }],
}

describe('renderPublicTripPage', () => {
  it('replaces the generic noindex head with the trip, once', () => {
    const html = renderPublicTripPage(SHELL, trip)
    expect(html).toContain('<title>Lisbona &amp; &lt;amici&gt; · Roamie</title>')
    expect(html).toContain('<meta name="description" content="Porto &quot;vecchia&quot; · Sintra" />')
    expect(html).toContain('<meta name="robots" content="index, follow, max-image-preview:large" />')
    expect(html).toContain('<link rel="canonical" href="https://roamie.org/p/lisbona-k3m9x2ab" />')
    expect(html).toContain('<meta property="og:image" content="https://upload.wikimedia.org/wikipedia/commons/a/ab/Porto.jpg" />')
    expect(html).not.toContain('noindex')
    expect(html).not.toContain('<!--')
    for (const tag of [/<title>/g, /og:title/g, /og:image"/g, /twitter:card/g, /name="description"/g]) expect(html.match(tag)).toHaveLength(1)
    expect(html).toContain('<script type="module" crossorigin src="/assets/shell-abc.js"></script>')
    expect(html).toContain('<li>10:00 Tram 28 (Alfama)</li>')
    expect(html).not.toContain('<amici>')
  })

  it('falls back to the Roamie preview image when no photo is from Wikimedia', () => {
    const html = renderPublicTripPage(SHELL, { ...trip, destinations: [{ name: 'Sintra', country: null, image_url: 'https://evil.example/x.png' }] })
    expect(html).toContain('<meta property="og:image" content="https://roamie.org/og/it.png" />')
    expect(html).not.toContain('evil.example')
  })

  it('keeps JSON-LD inside its script element', () => {
    const html = renderPublicTripPage(SHELL, { ...trip, name: '</script><script>alert(1)</script>' })
    expect(html).not.toContain('</script><script>alert(1)')
  })

  it('leaves the shell untouched when the trip is not public', () => {
    expect(renderPublicTripPage(SHELL, null)).toBe(SHELL)
  })
})
