/**
 * TikTok through the Content Posting API. Needs TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET and TIKTOK_REFRESH_TOKEN
 * (see automation/README.md).
 *
 * By default the video goes to the account's TikTok inbox as a draft (scope video.upload): the owner gets a
 * notification, picks a trending sound in the app and posts it, which the API can't do. TIKTOK_MODE=direct posts it
 * straight away instead (scope video.publish); until TikTok audits the app such posts can only be private (SELF_ONLY),
 * so set TIKTOK_PRIVACY=PUBLIC_TO_EVERYONE once it's approved.
 */
import { readFileSync, statSync } from 'node:fs'

const API = 'https://open.tiktokapis.com/v2'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export const tiktok = {
  name: 'tiktok',
  ready: () => Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_REFRESH_TOKEN),

  async publish({ file, caption }) {
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

    const size = statSync(file).size
    const draft = process.env.TIKTOK_MODE !== 'direct'
    const source_info = { source: 'FILE_UPLOAD', video_size: size, chunk_size: size, total_chunk_count: 1 }
    const init = await fetch(`${API}/post/publish/${draft ? 'inbox/' : ''}video/init/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(
        draft
          ? { source_info }
          : {
              post_info: { title: caption.slice(0, 2200), privacy_level: process.env.TIKTOK_PRIVACY ?? 'SELF_ONLY', disable_comment: false, disable_duet: false, disable_stitch: false },
              source_info,
            },
      ),
    }).then((r) => r.json())
    if (!init.data?.upload_url) throw new Error(`TikTok init: ${JSON.stringify(init.error ?? init).slice(0, 300)}`)

    const upload = await fetch(init.data.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size), 'Content-Range': `bytes 0-${size - 1}/${size}` },
      body: readFileSync(file),
    })
    if (!upload.ok) throw new Error(`TikTok upload: ${upload.status} ${await upload.text()}`)

    for (let i = 0; i < 30; i++) {
      const status = await fetch(`${API}/post/publish/status/fetch/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ publish_id: init.data.publish_id }),
      }).then((r) => r.json())
      // A draft ends in the inbox: its caption is the one in the Telegram kit.
      if (status.data?.status === 'PUBLISH_COMPLETE' || status.data?.status === 'SEND_TO_USER_INBOX') return { id: init.data.publish_id, url: null, draft }
      if (status.data?.status === 'FAILED') throw new Error(`TikTok processing: ${status.data.fail_reason}`)
      await wait(10_000)
    }
    return { id: init.data.publish_id, url: null }
  },
}
