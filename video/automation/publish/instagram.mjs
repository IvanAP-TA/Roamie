/**
 * Instagram Reels through the Instagram Graph API (a Business or Creator account linked to a Facebook Page).
 * Needs INSTAGRAM_USER_ID (the Instagram account's id) and INSTAGRAM_ACCESS_TOKEN (a Page access token derived from
 * a long-lived user token, which does not expire; see automation/README.md). The video goes up with a resumable
 * upload, so it needs no public URL. Carousels are different: Instagram fetches each slide from a public URL (served by
 * the social-media Edge Function at roamie.org/social/…).
 */
import { readFileSync, statSync } from 'node:fs'

const GRAPH = () => `https://graph.facebook.com/${process.env.META_GRAPH_VERSION ?? 'v26.0'}`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export const instagram = {
  name: 'instagram',
  ready: () => Boolean(process.env.INSTAGRAM_USER_ID && process.env.INSTAGRAM_ACCESS_TOKEN),

  /** The token reaches the account. */
  async check() {
    const me = await fetch(`${GRAPH()}/${process.env.INSTAGRAM_USER_ID}?fields=username&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`).then((r) => r.json())
    if (!me.username) throw new Error(`Instagram account: ${me.error?.message ?? JSON.stringify(me)}`.slice(0, 300))
    return `@${me.username}`
  },

  async publish({ file, caption }) {
    const user = process.env.INSTAGRAM_USER_ID
    const token = process.env.INSTAGRAM_ACCESS_TOKEN
    const create = await fetch(`${GRAPH()}/${user}/media`, {
      method: 'POST',
      body: new URLSearchParams({ media_type: 'REELS', upload_type: 'resumable', caption: caption.slice(0, 2200), share_to_feed: 'true', access_token: token }),
    }).then((r) => r.json())
    if (!create.id || !create.uri) throw new Error(`Instagram container: ${JSON.stringify(create).slice(0, 300)}`)

    const size = statSync(file).size
    const upload = await fetch(create.uri, {
      method: 'POST',
      headers: { Authorization: `OAuth ${token}`, offset: '0', file_size: String(size) },
      body: readFileSync(file),
    })
    if (!upload.ok) throw new Error(`Instagram upload: ${upload.status} ${await upload.text()}`)

    return publishContainer(user, token, create.id)
  },

  /** A carousel of 2–10 JPEGs at public URLs, in order. */
  async publishCarousel({ imageUrls, caption }) {
    if (!imageUrls?.length) throw new Error('slides not hosted (SOCIAL_UPLOAD_SECRET missing)')
    const user = process.env.INSTAGRAM_USER_ID
    const token = process.env.INSTAGRAM_ACCESS_TOKEN
    const children = []
    for (const url of imageUrls.slice(0, 10)) {
      const item = await fetch(`${GRAPH()}/${user}/media`, { method: 'POST', body: new URLSearchParams({ image_url: url, is_carousel_item: 'true', access_token: token }) }).then((r) => r.json())
      if (!item.id) throw new Error(`Instagram slide: ${JSON.stringify(item).slice(0, 300)}`)
      children.push(item.id)
    }
    const create = await fetch(`${GRAPH()}/${user}/media`, {
      method: 'POST',
      body: new URLSearchParams({ media_type: 'CAROUSEL', children: children.join(','), caption: caption.slice(0, 2200), access_token: token }),
    }).then((r) => r.json())
    if (!create.id) throw new Error(`Instagram carousel: ${JSON.stringify(create).slice(0, 300)}`)
    return publishContainer(user, token, create.id)
  },
}

/** Waits until Instagram has processed a container, publishes it and returns its link. */
async function publishContainer(user, token, id) {
  for (let i = 0; i < 40; i++) {
    const status = await fetch(`${GRAPH()}/${id}?fields=status_code,status&access_token=${token}`).then((r) => r.json())
    if (status.status_code === 'FINISHED') break
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') throw new Error(`Instagram processing: ${status.status}`)
    await wait(10_000)
  }
  const publish = await fetch(`${GRAPH()}/${user}/media_publish`, { method: 'POST', body: new URLSearchParams({ creation_id: id, access_token: token }) }).then((r) => r.json())
  if (!publish.id) throw new Error(`Instagram publish: ${JSON.stringify(publish).slice(0, 300)}`)
  const media = await fetch(`${GRAPH()}/${publish.id}?fields=permalink&access_token=${token}`).then((r) => r.json())
  return { id: publish.id, url: media.permalink ?? null }
}
