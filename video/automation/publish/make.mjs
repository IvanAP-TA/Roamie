/**
 * LinkedIn company page posts, through a Make.com scenario: LinkedIn only lets approved apps post for a company page,
 * and Make's LinkedIn app is one. The scenario ("Roamie · LinkedIn post", see automation/README.md) is:
 *
 *   Webhooks › Custom webhook  →  LinkedIn › Create a Company Image Post (image by link)
 *
 * The bot sends { text, image_url } to the webhook. Needs MAKE_LINKEDIN_WEBHOOK (the webhook's address, a secret:
 * whoever has it can post on the page).
 */

/**
 * The post's text in LinkedIn's "little text format", which the API reads: its reserved characters are escaped
 * (otherwise LinkedIn cuts the post at the first unescaped one, an opening parenthesis in a photo credit for
 * instance) and hashtags become LinkedIn's hashtag markup, so they stay clickable. Make sends the text as it is.
 */
export function littleText(text) {
  return text
    .replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`)
    .replace(/\\#([A-Za-z]\w*)/g, (_, tag) => `{hashtag|\\#|${tag}}`)
}

export const make = {
  name: 'linkedin',
  ready: () => Boolean(process.env.MAKE_LINKEDIN_WEBHOOK),

  async publish({ text, imageUrl }) {
    const response = await fetch(process.env.MAKE_LINKEDIN_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: littleText(text), image_url: imageUrl }),
      signal: AbortSignal.timeout(30_000),
    })
    const answer = await response.text().catch(() => '')
    // Make answers "Accepted" once the scenario has the data; LinkedIn's own errors show in Make's history.
    if (!response.ok) throw new Error(`Make webhook: ${response.status} ${answer.slice(0, 120)}`)
    return { id: answer.slice(0, 60) || 'accepted' }
  },
}
