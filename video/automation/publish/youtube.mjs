/**
 * YouTube Shorts: a vertical video under three minutes uploaded through the YouTube Data API becomes a Short.
 * Needs YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and YOUTUBE_REFRESH_TOKEN (an OAuth client of type "Web application" and a
 * refresh token with the youtube.upload scope; see automation/README.md). Until Google verifies the app, YouTube
 * keeps API uploads private.
 */
import { readFileSync, statSync } from 'node:fs'

/** A fresh access token from the long-lived refresh token. */
async function accessToken() {
  const token = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  }).then((r) => r.json())
  if (!token.access_token) throw new Error(`YouTube token: ${token.error ?? 'no access token'}`)
  return token
}

export const youtube = {
  name: 'youtube',
  ready: () => Boolean(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET && process.env.YOUTUBE_REFRESH_TOKEN),

  /** The keys work and may upload. */
  async check() {
    const { access_token } = await accessToken()
    const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${access_token}`).then((r) => r.json())
    if (!info.scope?.includes('youtube.upload')) throw new Error(`YouTube token without the youtube.upload scope (${info.scope ?? info.error})`)
    return 'token ok, upload allowed'
  },

  async publish({ file, title, description, tags }) {
    const token = await accessToken()

    const size = statSync(file).size
    const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(size),
      },
      body: JSON.stringify({
        snippet: { title: title.slice(0, 100), description: description.slice(0, 4900), tags: tags.map((t) => t.replace('#', '')), categoryId: '19' },
        status: { privacyStatus: process.env.YOUTUBE_PRIVACY ?? 'public', selfDeclaredMadeForKids: false },
      }),
    })
    const location = start.headers.get('location')
    if (!start.ok || !location) throw new Error(`YouTube upload start: ${start.status} ${await start.text()}`)

    const upload = await fetch(location, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size) }, body: readFileSync(file) })
    const video = await upload.json()
    if (!upload.ok || !video.id) throw new Error(`YouTube upload: ${upload.status} ${JSON.stringify(video).slice(0, 300)}`)
    return { id: video.id, url: `https://youtube.com/shorts/${video.id}` }
  },
}
