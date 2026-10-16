/**
 * LinkedIn company page posts, through a Make.com scenario: LinkedIn only lets approved apps post for a company page,
 * and Make's LinkedIn app is one. The scenario (set up once, see automation/README.md) is:
 *
 *   Webhooks › Custom webhook  →  HTTP › Get a file (image_url)  →  LinkedIn › Create a Company Image Post
 *
 * The bot sends { text, image_url } to the webhook. Needs MAKE_LINKEDIN_WEBHOOK (the webhook's address, a secret:
 * whoever has it can post on the page).
 */
export const make = {
  name: 'linkedin',
  ready: () => Boolean(process.env.MAKE_LINKEDIN_WEBHOOK),

  async publish({ text, imageUrl }) {
    const response = await fetch(process.env.MAKE_LINKEDIN_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, image_url: imageUrl }),
      signal: AbortSignal.timeout(30_000),
    })
    const answer = await response.text().catch(() => '')
    // Make answers "Accepted" once the scenario has the data; LinkedIn's own errors show in Make's history.
    if (!response.ok) throw new Error(`Make webhook: ${response.status} ${answer.slice(0, 120)}`)
    return { id: answer.slice(0, 60) || 'accepted' }
  },
}
