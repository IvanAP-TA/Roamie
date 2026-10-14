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

/** Waits until TikTok has processed the post: in the inbox for a draft, published otherwise. */
async function settle(token, publishId) {
  for (let i = 0; i < 30; i++) {
    const status = await fetch(`${API}/post/publish/status/fetch/`, json(token, { publish_id: publishId })).then((r) => r.json())
    // A draft ends in the inbox: its caption is the one in the Telegram kit.
    if (status.data?.status === 'PUBLISH_COMPLETE' || status.data?.status === 'SEND_TO_USER_INBOX') return { id: publishId, url: null, draft: draft() }
    if (status.data?.status === 'FAILED') throw new Error(`TikTok processing: ${status.data.fail_reason}`)
    await wait(10_000)
  }
  return { id: publishId, url: null, draft: draft() }
}

export const tiktok = {
  name: 'tiktok',
  ready: () => Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_REFRESH_TOKEN),

  /** The refresh token still gives an access token. */
  async check() {
    await accessToken()
    return 'token ok'
  },

  async publish({ file, caption }) {
    const token = await accessToken()
    const size = statSync(file).size
    const source_info = { source: 'FILE_UPLOAD', video_size: size, chunk_size: size, total_chunk_count: 1 }
    const init = await fetch(
      `${API}/post/publish/${draft() ? 'inbox/' : ''}video/init/`,
      json(
        token,
        draft()
          ? { source_info }
          : {
              post_info: { title: caption.slice(0, 2200), privacy_level: process.env.TIKTOK_PRIVACY ?? 'SELF_ONLY', disable_comment: false, disable_duet: false, disable_stitch: false },
              source_info,
            },
      ),
    ).then((r) => r.json())
    if (!init.data?.upload_url) throw new Error(`TikTok init: ${JSON.stringify(init.error ?? init).slice(0, 300)}`)

    const upload = await fetch(init.data.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size), 'Content-Range': `bytes 0-${size - 1}/${size}` },
      body: readFileSync(file),
    })
    if (!upload.ok) throw new Error(`TikTok upload: ${upload.status} ${await upload.text()}`)
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
