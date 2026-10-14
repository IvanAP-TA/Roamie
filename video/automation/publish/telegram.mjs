/**
 * The "kit" for posting by hand: the video and the ready-to-copy texts, sent to a Telegram chat. The platforms' own
 * music (trending sounds) can only be added inside their apps, so the video is posted from the phone with a sound
 * picked there. Needs TELEGRAM_BOT_TOKEN (from @BotFather) and TELEGRAM_CHAT_ID (see automation/README.md).
 *
 * In Telegram, text inside <code> is copied with one tap, so each text goes in its own block.
 */
import { readFileSync } from 'node:fs'

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * The messages after the media: one per text to copy, labelled in Italian (they're for the owner, not the public).
 * A carousel has no YouTube texts: Shorts are videos only.
 */
export function kitMessages({ caption, title, description }) {
  return [
    `<b>Instagram e TikTok</b> · didascalia\n\n<code>${escape(caption)}</code>`,
    ...(title ? [`<b>YouTube Shorts</b> · titolo\n\n<code>${escape(title)}</code>`] : []),
    ...(description ? [`<b>YouTube Shorts</b> · descrizione\n\n<code>${escape(description)}</code>`] : []),
  ]
}

// What usually fixes each failure, for the owner reading the alert on the phone.
const HINTS = [
  [/deleted_client|invalid_client|invalid_grant/, 'serve un nuovo token YouTube (client ID, secret e refresh token su GitHub)'],
  [/TikTok token|access_token_invalid|refresh_token/i, 'serve un nuovo refresh token TikTok'],
  [/OAuthException|Cannot call API|access token/i, 'serve un nuovo token Meta (Graph API Explorer → INSTAGRAM_ACCESS_TOKEN su GitHub)'],
]

/** The alert for platforms that failed, or nothing when all went well. */
export function failureMessage(results) {
  const failed = Object.entries(results).filter(([name, r]) => name !== 'telegram' && r?.error)
  if (!failed.length) return null
  const lines = failed.map(([name, r]) => {
    const hint = HINTS.find(([pattern]) => pattern.test(r.error))?.[1]
    return `• <b>${escape(name)}</b>: ${escape(r.error.slice(0, 160))}${hint ? `\n  → ${hint}` : ''}`
  })
  return `⚠️ <b>Non pubblicato su ${failed.map(([name]) => escape(name)).join(', ')}</b>\n\n${lines.join('\n')}`
}

async function call(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, { method: 'POST', body })
  const data = await response.json().catch(() => ({}))
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description ?? response.status}`)
  return data.result
}

export const telegram = {
  name: 'telegram',
  ready: () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),

  async publish({ file, summary, ...texts }) {
    const chat = process.env.TELEGRAM_CHAT_ID
    const video = new FormData()
    video.set('chat_id', chat)
    video.set('caption', `🎬 Nuovo video: ${summary}\n\nSe lo pubblichi a mano, i testi sono qui sotto.`)
    video.set('supports_streaming', 'true')
    video.set('width', '1080')
    video.set('height', '1920')
    video.set('video', new Blob([readFileSync(file)], { type: 'video/mp4' }), 'roamie.mp4')
    const sent = await call('sendVideo', video)

    for (const text of kitMessages(texts)) {
      await call('sendMessage', new URLSearchParams({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: 'true' }))
    }
    return { id: String(sent.message_id) }
  },

  /** A carousel: the slides as one album (Telegram allows up to 10), then the caption to copy. */
  async publishCarousel({ files, summary, caption }) {
    const chat = process.env.TELEGRAM_CHAT_ID
    const slides = files.slice(0, 10)
    const album = new FormData()
    album.set('chat_id', chat)
    album.set(
      'media',
      JSON.stringify(
        slides.map((_, i) => ({
          type: 'photo',
          media: `attach://slide${i}`,
          ...(i === 0 && { caption: `🖼️ Nuovo carosello: ${summary}\n\nSe lo pubblichi a mano, il testo è qui sotto.` }),
        })),
      ),
    )
    slides.forEach((file, i) => album.set(`slide${i}`, new Blob([readFileSync(file)], { type: 'image/jpeg' }), `slide-${i + 1}.jpg`))
    const sent = await call('sendMediaGroup', album)

    for (const text of kitMessages({ caption })) {
      await call('sendMessage', new URLSearchParams({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: 'true' }))
    }
    return { id: String(sent[0]?.message_id ?? '') }
  },

  /** Tells the owner which platforms failed, so a broken token doesn't go unnoticed for days. */
  async alert(results) {
    const text = failureMessage(results)
    if (!text) return
    await call('sendMessage', new URLSearchParams({ chat_id: process.env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: 'true' }))
  },
}
