/**
 * YouTube comments through the official Data API v3, read-only, with an API key (YOUTUBE_API_KEY, from the Google
 * Cloud project that already uploads the Shorts: APIs & Services → Credentials → API key, restricted to the YouTube
 * Data API). Under videos about travelling with friends, people tell exactly where group trips get stuck.
 *
 * A weekly run costs well under the free daily quota: each search is 100 units, each page of comments 1.
 */
const API = 'https://www.googleapis.com/youtube/v3'

async function api(path, params) {
  const url = `${API}/${path}?${new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY })}`
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`YouTube ${path}: ${response.status} ${data.error?.message ?? ''}`.trim())
  return data
}

export const youtubeComments = {
  ready: () => Boolean(process.env.YOUTUBE_API_KEY),

  /** The month's most relevant videos for a query, with their most relevant comments (in the same shape as posts). */
  async search(query, { videos = 4, comments = 15 } = {}) {
    const since = new Date(Date.now() - 45 * 86_400_000).toISOString()
    const found = await api('search', { part: 'snippet', q: query, type: 'video', order: 'relevance', relevanceLanguage: 'en', publishedAfter: since, maxResults: String(videos), safeSearch: 'strict' })
    const posts = []
    for (const item of found.items ?? []) {
      const id = item.id?.videoId
      if (!id) continue
      const threads = await api('commentThreads', { part: 'snippet', videoId: id, order: 'relevance', maxResults: String(comments), textFormat: 'plainText' }).catch(() => ({ items: [] }))
      const top = (threads.items ?? [])
        .map((t) => t.snippet?.topLevelComment?.snippet)
        .filter((c) => c?.textDisplay && c.textDisplay.length > 40)
        .sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
        .slice(0, 8)
      if (top.length < 3) continue
      posts.push({ id, title: item.snippet.title, text: '', score: top.reduce((s, c) => s + (c.likeCount ?? 0), 0), comments: top.length, top: top.map((c) => c.textDisplay.slice(0, 400)) })
    }
    return posts
  },
}
