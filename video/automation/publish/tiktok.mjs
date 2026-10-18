/**
 * TikTok through the Content Posting API. Needs TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET and TIKTOK_REFRESH_TOKEN
 * (see automation/README.md).
 *
 * By default posts go to the account's TikTok inbox as drafts (scope video.upload): the owner gets a notification,
 * picks a trending sound in the app and posts it, which the API can't do. TIKTOK_MODE=direct posts videos straight
 * away instead (scope video.publish); until TikTok audits the app such posts can only be private (SELF_ONLY), so set
 * TIKTOK_PRIVACY=PUBLIC_TO_EVERYONE once it's approved.
 *
 * Carousels are photo posts: TikTok pulls the slides from their public URLs, which must be on a domain verified in
 * the developer portal (roamie.org).
 */
import { readFileSync, statSync } from 'node:fs'

const API = 'https://open.tiktokapis.com/v2'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const draft = () => process.env.TIKTOK_MODE !== 'direct'

/** A fresh access token from the long-lived refresh token. */
async function accessToken() {
  const token = await fetch(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: process.env.TIKTOK_REFRESH_TOKEN,
    }),
  }).then((r) => r.json())
  if (!token.access_token) throw new Error(`TikTok token: ${token.error_description ?? token.error ?? 'no access token'}`)
  return token.access_token
}

const json = (token, body) => ({ method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(body) })

/** TikTok's processing state of a post: { status, fail_reason, ... } or { error }. */
async function fetchStatus(token, publishId) {
  const answer = await fetch(`${API}/post/publish/status/fetch/`, json(token, { publish_id: publishId })).then((r) => r.json())
  return answer.data?.status ? answer.data : { error: answer.error?.message || answer.error?.code || 'no status' }
}

/**
 * Waits until TikTok has processed the post: in the inbox for a draft, published otherwise. TikTok can take a long
 * time (a draft once took twenty minutes), so after five minutes the post counts as sent, with the last state seen;
 * the keys check (kind=check) tells later where it got to.
 */
async function settle(token, publishId) {
  let last = 'unknown'
  for (let i = 0; i < 30; i++) {
    const status = await fetchStatus(token, publishId)
    last = status.status ?? status.error
    // A draft ends in the inbox: its caption is the one in the Telegram kit.
    if (last === 'PUBLISH_COMPLETE' || last === 'SEND_TO_USER_INBOX') return { id: publishId, url: null, draft: draft(), status: last }
    if (last === 'FAILED') throw new Error(`TikTok processing: ${status.fail_reason}`)
    await wait(10_000)
  }
  return { id: publishId, url: null, draft: draft(), status: last }
}

/**
 * How a video is sent: TikTok takes it in parts of 5 to 64 MB (one part when it's smaller than 5 MB), the last part
 * taking the rest. A whole video in one request sometimes never finishes processing (stuck at PROCESSING_UPLOAD).
 */
export function uploadChunks(size, chunk = 10_000_000) {
  if (size < 5_000_000) return [{ start: 0, end: size - 1 }]
  const count = Math.max(1, Math.floor(size / chunk))
  return Array.from({ length: count }, (_, i) => ({ start: i * chunk, end: i === count - 1 ? size - 1 : (i + 1) * chunk - 1 }))
}

export const tiktok = {
  name: 'tiktok',
  ready: () => Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_REFRESH_TOKEN),

  /** The refresh token still gives an access token; with a publish id, also where that post got to. */
  async check(lastPublishId) {
    const token = await accessToken()
    if (!lastPublishId) return 'token ok'
    const status = await fetchStatus(token, lastPublishId)
    return `token ok · last post ${status.status ?? status.error}${status.fail_reason ? ` (${status.fail_reason})` : ''}`
  },

  async publish({ file, caption }) {
    const token = await accessToken()
    const size = statSync(file).size
    const chunks = uploadChunks(size)
    const source_info = { source: 'FILE_UPLOAD', video_size: size, chunk_size: chunks[0].end - chunks[0].start + 1, total_chunk_count: chunks.length }
    const init = await fetch(
      `${API}/post/publish/${draft() ? 'inbox/' : ''}video/init/`,
      json(
        token,
        draft()
          ? { source_info }
          : {
              post_info: { title: caption.slice(0, 2200), privacy_level: process.env.TIKTOK_PRIVACY || 'SELF_ONLY', disable_comment: false, disable_duet: false, disable_stitch: false },
              source_info,
            },
      ),
    ).then((r) => r.json())
    if (!init.data?.upload_url) throw new Error(`TikTok init: ${JSON.stringify(init.error ?? init).slice(0, 300)}`)

    const video = readFileSync(file)
    for (const [i, { start, end }] of chunks.entries()) {
      const upload = await fetch(init.data.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${size}` },
        body: video.subarray(start, end + 1),
      })
      if (!upload.ok) throw new Error(`TikTok upload, part ${i + 1} of ${chunks.length}: ${upload.status} ${await upload.text()}`)
    }
    return settle(token, init.data.publish_id)
  },

  /** A photo post (2–35 images) as a draft: TikTok shows it in the app's inbox, where a sound is added before posting. */
  async publishCarousel({ imageUrls, caption }) {
    if (!imageUrls?.length) throw new Error('slides not hosted (SOCIAL_UPLOAD_SECRET missing)')
    const token = await accessToken()
    const [title, ...rest] = caption.split('\n\n')
    const init = await fetch(
      `${API}/post/publish/content/init/`,
      json(token, {
        post_info: { title: title.slice(0, 90), description: rest.join('\n\n').slice(0, 4000) },
        source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: imageUrls.slice(0, 35) },
        post_mode: 'MEDIA_UPLOAD',
        media_type: 'PHOTO',
      }),
    ).then((r) => r.json())
    if (!init.data?.publish_id) throw new Error(`TikTok photo init: ${JSON.stringify(init.error ?? init).slice(0, 300)}`)
    // Photo posts always go as drafts, whatever TIKTOK_MODE says: the sound is what makes them work on TikTok.
    return { ...(await settle(token, init.data.publish_id)), draft: true }
  },
}
