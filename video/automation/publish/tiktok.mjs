/**
 * TikTok through the Content Posting API (direct post). Needs TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET and
 * TIKTOK_REFRESH_TOKEN (scope video.publish; see automation/README.md). Until TikTok audits the app, posts can only be
 * private (SELF_ONLY): set TIKTOK_PRIVACY=PUBLIC_TO_EVERYONE once it's approved.
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
    const init = await fetch(`${API}/post/publish/video/init/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        post_info: { title: caption.slice(0, 2200), privacy_level: process.env.TIKTOK_PRIVACY ?? 'SELF_ONLY', disable_comment: false, disable_duet: false, disable_stitch: false },
        source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: size, total_chunk_count: 1 },
      }),
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
      if (status.data?.status === 'PUBLISH_COMPLETE') return { id: init.data.publish_id, url: null }
      if (status.data?.status === 'FAILED') throw new Error(`TikTok processing: ${status.data.fail_reason}`)
      await wait(10_000)
    }
    return { id: init.data.publish_id, url: null }
  },
}
