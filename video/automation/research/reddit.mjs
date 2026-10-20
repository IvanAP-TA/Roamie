/**
 * Reddit through its official API, read-only, with an application token (no user account involved). Needs a Reddit
 * app of type "script" (reddit.com/prefs/apps): REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET. Keyless access (JSON or
 * RSS) is blocked or rate-limited from servers, and Reddit's terms ask for registered apps anyway.
 *
 * Only public posts and their top comments are read, a few dozen requests a week, well under the free limit.
 */
const UA = () => process.env.REDDIT_USER_AGENT || 'web:org.roamie.research:1.0 (by roamie.org)'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(token, path) {
  const response = await fetch(`https://oauth.reddit.com${path}`, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA() }, signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`Reddit ${path.split('?')[0]}: ${response.status}`)
  // Politely: one request a second.
  await wait(1000)
  return response.json()
}

export const reddit = {
  ready: () => Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),

  async token() {
    const basic = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64')
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'User-Agent': UA(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
      signal: AbortSignal.timeout(20_000),
    })
    const data = await response.json().catch(() => ({}))
    if (!data.access_token) throw new Error(`Reddit token: ${data.error ?? response.status}`)
    return data.access_token
  },

  /** The month's most upvoted posts for a query, across Reddit or in one subreddit; safe-for-work only. */
  async search(token, query, { subreddit, limit = 15 } = {}) {
    const where = subreddit ? `/r/${subreddit}/search` : '/search'
    const params = new URLSearchParams({ q: query, t: 'month', sort: 'top', limit: String(limit), type: 'link', raw_json: '1', ...(subreddit && { restrict_sr: '1' }) })
    const data = await api(token, `${where}?${params}`)
    return (data.data?.children ?? [])
      .map((c) => c.data)
      .filter((p) => !p.over_18 && (p.score >= 5 || p.num_comments >= 5))
      .map((p) => ({ id: p.id, title: p.title, text: (p.selftext ?? '').slice(0, 700), score: p.score, comments: p.num_comments, subreddit: p.subreddit }))
  },

  /** A post's most upvoted top-level comments. */
  async topComments(token, id, n = 5) {
    const data = await api(token, `/comments/${id}?limit=${n}&sort=top&depth=1&raw_json=1`)
    return (data[1]?.data?.children ?? [])
      .map((c) => c.data)
      .filter((c) => c?.body && c.body !== '[deleted]' && c.body !== '[removed]')
      .slice(0, n)
      .map((c) => c.body.slice(0, 400))
  },
}
