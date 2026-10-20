import { describe, expect, it } from 'vitest'
import { inviteImage, inviteMeta, pickLang, renderInvitePage, type InviteCard } from './_invite.js'

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
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`

const card: InviteCard = {
  name: 'Estate "2027" & <amici>',
  cover_image_url: null,
  member_count: 5,
  destination_count: 7,
  destinations: [
    { name: 'Lisbona', image_url: null },
    { name: 'Oslo', image_url: null },
    { name: 'Kyoto', image_url: null },
  ],
}

describe('invite previews', () => {
  it('picks the language from ?lang or Accept-Language, Italian otherwise', () => {
    expect(pickLang('en-GB,en;q=0.9')).toBe('en')
    expect(pickLang('es')).toBe('es')
    expect(pickLang('fr-FR')).toBe('it')
    expect(pickLang(null)).toBe('it')
  })

  it('describes the trip in the link preview', () => {
    const meta = inviteMeta(card, 'K7PQ2MXA', 'it')
    expect(meta.title).toBe('Unisciti a «Estate "2027" & <amici>» su Roamie')
    expect(meta.description).toBe('5 viaggiatori · 7 mete in gara. Si sceglie tra Lisbona, Oslo e Kyoto. Entri con il solo nome e voti dal telefono, senza app né account.')
    expect(meta.image).toMatch(/^https:\/\/roamie\.org\/api\/og\/invite\?code=K7PQ2MXA&lang=it&v=/)
    expect(inviteMeta({ ...card, member_count: 1, destination_count: 0, destinations: [] }, 'K7PQ2MXA', 'en').description).toBe(
      '1 traveller. Join with just your name and vote from your phone, no app or account needed.',
    )
  })

  it('swaps the generic preview for the escaped trip preview, and stays out of search engines', () => {
    const html = renderInvitePage(SHELL, card, 'K7PQ2MXA', 'it')
    expect(html).toContain('<title>Unisciti a «Estate &quot;2027&quot; &amp; &lt;amici&gt;» su Roamie</title>')
    expect(html).toContain('<meta name="robots" content="noindex, follow" />')
    expect(html).toContain('og:image" content="https://roamie.org/api/og/invite?code=K7PQ2MXA&amp;lang=it')
    expect(html).not.toContain('og/it.png')
    expect(html).not.toContain('<amici>')
    expect(html.match(/<title>/g)).toHaveLength(1)
    expect(renderInvitePage(SHELL, null, 'K7PQ2MXA', 'it')).toBe(SHELL)
  })

  it('draws the image from the card alone', () => {
    const tree = JSON.stringify(inviteImage(card, 'es', { cover: null, destinations: [null, null, null] }))
    expect(tree).toContain('Te invitan a')
    expect(tree).toContain('Estate \\"2027\\" & <amici>')
    expect(tree).toContain('Kyoto')
    expect(tree).toContain('5 viajeros · 7 destinos en juego')
  })
})
