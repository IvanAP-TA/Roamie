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
  [/Make webhook/, 'controlla lo scenario su Make (attivo? collegamento LinkedIn scaduto?) e il secret MAKE_LINKEDIN_WEBHOOK'],
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * One Bot API call. Telegram's own hiccups (a 5xx such as "Gateway Timeout" on a big video, too many requests, a
 * dropped connection) are tried again, up to three times; a refusal (4xx) is not.
 */
export async function call(method, body, { tries = 3, wait = 5_000 } = {}) {
  for (let attempt = 1; ; attempt++) {
    let response, data
    try {
      response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, { method: 'POST', body, signal: AbortSignal.timeout(120_000) })
      data = await response.json().catch(() => ({}))
    } catch (error) {
      if (attempt >= tries) throw new Error(`Telegram ${method}: ${error.message}`)
      await sleep(wait * attempt)
      continue
    }
    if (data.ok) return data.result
    const passing = response.status >= 500 || response.status === 429
    if (!passing || attempt >= tries) throw new Error(`Telegram ${method}: ${data.description ?? response.status}`)
    await sleep(Math.max(wait * attempt, (data.parameters?.retry_after ?? 0) * 1000))
  }
}

/** The kit's texts after the media; if the media didn't get through, they still go, with a note on where it is. */
async function sendTexts(chat, texts, mediaError) {
  const messages = kitMessages(texts)
  if (mediaError) messages.unshift(`⚠️ Il file non è arrivato su Telegram (${escape(mediaError.message.slice(0, 120))}). Lo scarichi dagli Artifacts dell'esecuzione su GitHub; i testi sono qui sotto.`)
  for (const text of messages) {
    await call('sendMessage', new URLSearchParams({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: 'true' }))
  }
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
    const sent = await call('sendVideo', video).catch((error) => error)
    await sendTexts(chat, texts, sent instanceof Error ? sent : null)
    if (sent instanceof Error) throw sent
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
    const sent = await call('sendMediaGroup', album).catch((error) => error)
    await sendTexts(chat, { caption }, sent instanceof Error ? sent : null)
    if (sent instanceof Error) throw sent
    return { id: String(sent[0]?.message_id ?? '') }
  },

  /**
   * A LinkedIn post: the image, then the text to copy. `posted` says whether it already went out on the page by
   * itself (then the kit is only for reference).
   */
  async publishLinkedIn({ image, text, summary, posted }) {
    const chat = process.env.TELEGRAM_CHAT_ID
    const photo = new FormData()
    photo.set('chat_id', chat)
    photo.set('caption', posted ? `💼 Pubblicato su LinkedIn: ${summary}` : `💼 Post LinkedIn di oggi: ${summary}

Copialo dal messaggio qui sotto e pubblicalo sulla pagina Roamie con questa immagine.`)
    photo.set('photo', new Blob([image], { type: 'image/jpeg' }), 'linkedin.jpg')
    const sent = await call('sendPhoto', photo)
    await call('sendMessage', new URLSearchParams({ chat_id: chat, text: `<b>LinkedIn</b> · testo

<code>${escape(text)}</code>`, parse_mode: 'HTML', disable_web_page_preview: 'true' }))
    return { id: String(sent.message_id) }
  },

  /** The day's draft for Roamie's X account (linkedin/x.mjs), one tap to copy. */
  async xDraft(text) {
    await call('sendMessage', new URLSearchParams({ chat_id: process.env.TELEGRAM_CHAT_ID, text: `<b>X</b> · bozza per @getroamie1 (${text.length} caratteri)

<code>${escape(text)}</code>`, parse_mode: 'HTML', disable_web_page_preview: 'true' }))
  },

  /** A plain HTML message to the owner. */
  async message(text) {
    await call('sendMessage', new URLSearchParams({ chat_id: process.env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: 'true' }))
  },

  /** Tells the owner which platforms failed, so a broken token doesn't go unnoticed for days. */
  async alert(results) {
    const text = failureMessage(results)
    if (!text) return
    await call('sendMessage', new URLSearchParams({ chat_id: process.env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: 'true' }))
  },
}
