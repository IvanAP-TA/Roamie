/**
 * Public hosting for carousel slides: Instagram and TikTok fetch images from a URL instead of taking an upload. The
 * slides go to the social-media Edge Function (supabase/functions/social-media), which stores them and serves them
 * as https://roamie.org/social/<folder>/<n>.jpg. Needs SOCIAL_UPLOAD_SECRET (the same value as the function's).
 */
import { readFileSync } from 'node:fs'

const ENDPOINT = () => process.env.SOCIAL_MEDIA_URL ?? 'https://tvcumfzhnuljngdzuuue.supabase.co/functions/v1/social-media'

export const media = {
  ready: () => Boolean(process.env.SOCIAL_UPLOAD_SECRET),

  /** Uploads the slides in order under `folder` (e.g. 2026-10-14-ab12cd) and returns their public URLs. */
  async upload(files, folder) {
    const urls = []
    for (const [i, file] of files.entries()) {
      const response = await fetch(`${ENDPOINT()}?path=${encodeURIComponent(`${folder}/${i + 1}.jpg`)}`, {
        method: 'PUT',
        headers: { 'x-social-secret': process.env.SOCIAL_UPLOAD_SECRET, 'Content-Type': 'image/jpeg' },
        body: readFileSync(file),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.url) throw new Error(`slide ${i + 1}: ${response.status} ${data.error ?? ''}`)
      urls.push(data.url)
    }
    // The platforms fetch these right away: make sure the public address answers before handing it over.
    const check = await fetch(urls[0], { method: 'HEAD' }).catch(() => null)
    if (!check?.ok) throw new Error(`slides not reachable at ${urls[0]} (${check?.status ?? 'no answer'})`)
    return urls
  },
}
