/**
 * The trip's "Wrapped" story (1080×1920): where the group went, when, and how they got there — people, places in the
 * running, points, comments, spins of the wheel, stops — with the best-loved reason. Drawn on a canvas in the
 * browser like the other stories; nothing leaves the device.
 */
import { CARD_HEIGHT, CARD_WIDTH, DISPLAY, INK, SANS, SUN, background, fit, roundedRect } from './passportCard'
import { drawPhoto, fitSize, loadImage, wrap } from './storyCard'

export interface WrappedCardData {
  eyebrow: string
  /** Where they went, or the trip's name */
  title: string
  /** "12–15 Oct 2026 · 4 days" */
  subtitle: string | null
  tripName: string
  photoUrl: string | null
  /** Up to 6, in reading order */
  stats: { value: string; label: string }[]
  /** The best-loved reason to go, with who liked it */
  quote: { text: string; caption: string } | null
  /** "Giulia, Marco, Sara and 2 more" */
  people: string
  footer: string
}

const MARGIN = 88
const INNER = CARD_WIDTH - MARGIN * 2
const MUTED = 'rgba(255, 248, 241, 0.72)'

function draw(data: WrappedCardData, photo: HTMLImageElement | null): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unavailable')

  background(ctx)
  ctx.textBaseline = 'alphabetic'

  // Header
  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  ctx.font = `italic 600 64px ${DISPLAY}`
  ctx.fillText('roamie', MARGIN, 160)
  const logoWidth = ctx.measureText('roamie').width
  ctx.textAlign = 'right'
  ctx.fillStyle = MUTED
  ctx.font = `600 34px ${SANS}`
  ctx.fillText(fit(ctx, data.tripName, INNER - logoWidth - 48), CARD_WIDTH - MARGIN, 155)

  ctx.textAlign = 'left'
  ctx.fillStyle = SUN
  ctx.font = `600 36px ${SANS}`
  ctx.fillText(fit(ctx, data.eyebrow.toUpperCase(), INNER), MARGIN, 270)

  // Photo, then the place in big letters
  let y = 310
  if (photo) {
    drawPhoto(ctx, photo, MARGIN, y, INNER, 500)
    // Room for the tall capitals of the title under the photo.
    y += 500 + 150
  } else {
    y += 90
  }
  ctx.fillStyle = INK
  ctx.fillText(fitSize(ctx, data.title, INNER, (size) => `600 ${size}px ${DISPLAY}`, 150, 76), MARGIN - 4, y)
  if (data.subtitle) {
    ctx.fillStyle = MUTED
    ctx.font = `italic 500 50px ${DISPLAY}`
    ctx.fillText(fit(ctx, data.subtitle, INNER), MARGIN, y + 72)
  }
  y += data.subtitle ? 130 : 60

  // Stats: two columns of big numbers
  const columns = 2
  const gap = 24
  const boxW = (INNER - gap) / columns
  const boxH = photo ? 150 : 190
  const shown = data.stats.slice(0, 6)
  shown.forEach((stat, i) => {
    const x = MARGIN + (i % columns) * (boxW + gap)
    const top = y + Math.floor(i / columns) * (boxH + gap)
    // An odd one out takes the whole row.
    const w = i === shown.length - 1 && shown.length % 2 === 1 ? INNER : boxW
    roundedRect(ctx, x, top, w, boxH, 40)
    ctx.fillStyle = 'rgba(255, 248, 241, 0.1)'
    ctx.fill()
    ctx.textAlign = 'left'
    ctx.fillStyle = SUN
    ctx.fillText(fitSize(ctx, stat.value, w - 64, (size) => `600 ${size}px ${DISPLAY}`, photo ? 76 : 96, 44), x + 32, top + (photo ? 82 : 106))
    ctx.fillStyle = MUTED
    ctx.font = `600 30px ${SANS}`
    ctx.fillText(fit(ctx, stat.label, w - 64), x + 32, top + (photo ? 124 : 156))
  })
  y += Math.ceil(Math.min(data.stats.length, 6) / columns) * (boxH + gap) + 30

  // The best-loved reason
  if (data.quote && y < CARD_HEIGHT - 360) {
    ctx.fillStyle = INK
    ctx.font = `italic 500 50px ${DISPLAY}`
    const lines = wrap(ctx, `“${data.quote.text}”`, INNER, 2)
    lines.forEach((line, i) => ctx.fillText(line, MARGIN, y + 50 + i * 62))
    ctx.fillStyle = MUTED
    ctx.font = `600 30px ${SANS}`
    ctx.fillText(fit(ctx, data.quote.caption, INNER), MARGIN, y + 50 + lines.length * 62 + 6)
    y += 50 + lines.length * 62 + 40
  }

  // Who went
  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  ctx.font = `600 36px ${SANS}`
  ctx.fillText(fit(ctx, data.people, INNER), MARGIN, Math.min(Math.max(y + 40, CARD_HEIGHT - 200), CARD_HEIGHT - 170))

  // Footer
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255, 248, 241, 0.85)'
  ctx.font = `600 34px ${SANS}`
  ctx.fillText(data.footer, CARD_WIDTH / 2, CARD_HEIGHT - 76)

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas_export_failed'))), 'image/png'),
  )
}

export async function renderWrappedCard(data: WrappedCardData): Promise<Blob> {
  const [photo] = await Promise.all([
    data.photoUrl ? loadImage(data.photoUrl) : null,
    // The canvas only uses web fonts once they are loaded.
    ...[`600 100px ${DISPLAY}`, `italic 500 100px ${DISPLAY}`, `600 40px ${SANS}`].map((font) => document.fonts.load(font).catch(() => undefined)),
  ])
  try {
    return await draw(data, photo)
  } catch (error) {
    // A photo that taints the canvas can't be exported: draw without it.
    if (photo) return draw(data, null)
    throw error
  }
}
