/**
 * The Roamie Facebook Page: videos as Page Reels, carousels as multi-photo posts. Needs FACEBOOK_PAGE_ID and a Page
 * access token with pages_manage_posts: FACEBOOK_PAGE_TOKEN, or the Instagram one (INSTAGRAM_ACCESS_TOKEN is already the
 * Page's token, see automation/README.md) once it carries that permission.
 */
import { readFileSync, statSync } from 'node:fs'

const VERSION = () => process.env.META_GRAPH_VERSION ?? 'v26.0'
const GRAPH = () => `https://graph.facebook.com/${VERSION()}`
const token = () => process.env.FACEBOOK_PAGE_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function post(path, params) {
  const data = await fetch(`${GRAPH()}/${path}`, { method: 'POST', body: new URLSearchParams({ ...params, access_token: token() }) }).then((r) => r.json())
  if (data.error) throw new Error(`Facebook ${path}: ${data.error.message ?? JSON.stringify(data.error)}`.slice(0, 300))
  return data
}

export const facebook = {
  name: 'facebook',
  ready: () => Boolean(process.env.FACEBOOK_PAGE_ID && token()),

  /** The token reaches the Page and carries the permissions for posting and for the insights. */
  async check() {
    const page = await fetch(`${GRAPH()}/${process.env.FACEBOOK_PAGE_ID}?fields=name&access_token=${token()}`).then((r) => r.json())
    if (!page.name) throw new Error(`Facebook Page: ${page.error?.message ?? JSON.stringify(page)}`.slice(0, 300))
    const { data } = await fetch(`${GRAPH()}/debug_token?input_token=${token()}&access_token=${token()}`).then((r) => r.json())
    const missing = ['pages_manage_posts', 'instagram_manage_insights'].filter((s) => !data?.scopes?.includes(s))
    if (missing.length) throw new Error(`token without ${missing.join(', ')}`)
    return `${page.name}, ${data.expires_at ? `token expires ${new Date(data.expires_at * 1000).toISOString().slice(0, 10)}` : 'token never expires'}`
  },

  /** A Page Reel: start an upload, send the file, then publish it with the caption. */
  async publish({ file, caption }) {
    const page = process.env.FACEBOOK_PAGE_ID
    const start = await post(`${page}/video_reels`, { upload_phase: 'start' })
    if (!start.video_id) throw new Error('Facebook reel: no video id')

    const size = statSync(file).size
    const upload = await fetch(start.upload_url ?? `https://rupload.facebook.com/video-upload/${VERSION()}/${start.video_id}`, {
      method: 'POST',
      headers: { Authorization: `OAuth ${token()}`, offset: '0', file_size: String(size) },
      body: readFileSync(file),
    }).then((r) => r.json())
    if (!upload.success) throw new Error(`Facebook reel upload: ${JSON.stringify(upload).slice(0, 300)}`)

    await post(`${page}/video_reels`, { upload_phase: 'finish', video_id: start.video_id, video_state: 'PUBLISHED', description: caption.slice(0, 5000) })
    // Facebook processes the reel before it shows: wait for it, so a failure surfaces here and not silently later.
    for (let i = 0; i < 30; i++) {
      const status = await fetch(`${GRAPH()}/${start.video_id}?fields=status&access_token=${token()}`).then((r) => r.json())
      const state = status.status?.video_status
      if (state === 'ready' || status.status?.publishing_phase?.status === 'complete') break
      if (state === 'error') throw new Error(`Facebook reel processing: ${JSON.stringify(status.status).slice(0, 300)}`)
      await wait(10_000)
    }
    return { id: start.video_id, url: `https://www.facebook.com/reel/${start.video_id}` }
  },

  /** A multi-photo post: each slide uploaded unpublished from its public URL, then one post that attaches them all. */
  async publishCarousel({ imageUrls, caption }) {
    if (!imageUrls?.length) throw new Error('slides not hosted (SOCIAL_UPLOAD_SECRET missing)')
    const page = process.env.FACEBOOK_PAGE_ID
    const photos = []
    for (const url of imageUrls) photos.push((await post(`${page}/photos`, { url, published: 'false' })).id)
    const attached = Object.fromEntries(photos.map((id, i) => [`attached_media[${i}]`, JSON.stringify({ media_fbid: id })]))
    const created = await post(`${page}/feed`, { message: caption.slice(0, 5000), ...attached })
    return { id: created.id, url: `https://www.facebook.com/${created.id}` }
  },
}
