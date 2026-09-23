/**
 * The story image of a group decision (1080×1920): the wheel's pick with the ranking, or the ranking of a secret vote
 * once revealed. Drawn on a canvas in the browser like the passport card; nothing leaves the device.
 */
import { SLICE_COLORS } from '@/components/roulette/RouletteWheel'
import { CARD_HEIGHT, CARD_WIDTH, DISPLAY, INK, SANS, SUN, background, fit, roundedRect } from './passportCard'
import { safeImageUrl } from './utils'
import { sizedThumb } from './wikimedia'

export interface StoryRankingRow {
  id: string
  name: string
  points: number
  pointsLabel: string
}

export interface DecisionCardData {
  kind: 'wheel' | 'reveal'
  eyebrow: string
  /** The winner's name (wheel) or the reveal heading */
  title: string
  subtitle: string | null
  tripName: string
  /** Most points first */
  ranking: StoryRankingRow[]
  /** Highlighted row: the wheel's pick, or the vote's leader */
  winnerId: string | null
  photoUrl: string | null
  footer: string
}

const MARGIN = 96
const INNER = CARD_WIDTH - MARGIN * 2
const MUTED = 'rgba(255, 248, 241, 0.72)'
const DARK = '#2b1d17'
const PRIMARY = '#c24e27'

/** A destination photo the canvas can draw: Commons thumbnails at a story-friendly width, never the illustrated scenes. */
export function storyPhotoUrl(url: string | null | undefined): string | null {
  if (!url || url.startsWith('scene:')) return null
  const safe = safeImageUrl(url)
  return safe ? sizedThumb(safe, 960) : null
}

/** Resolves null when the photo can't be loaded for a canvas (no CORS, offline, slow): the card falls back to the wheel. */
export function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const timer = setTimeout(() => resolve(null), 8000)
    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'strict-origin-when-cross-origin'
    img.onload = () => {
      clearTimeout(timer)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    img.src = url
  })
}

/** Sets the largest font size (down to `min`) at which the text fits; below that the text is cut with "…". */
export function fitSize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, font: (size: number) => string, max: number, min: number) {
  for (let size = max; size >= min; size -= 4) {
    ctx.font = font(size)
    if (ctx.measureText(text).width <= maxWidth) return text
  }
  return fit(ctx, text, maxWidth)
}

export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  return [...lines.slice(0, maxLines - 1), fit(ctx, lines.slice(maxLines - 1).join(' '), maxWidth)]
}

export function drawPhoto(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  ctx.save()
  roundedRect(ctx, x, y, w, h, 56)
  ctx.clip()
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const [dw, dh] = [img.naturalWidth * scale, img.naturalHeight * scale]
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
  roundedRect(ctx, x, y, w, h, 56)
  ctx.lineWidth = 6
  ctx.strokeStyle = 'rgba(255, 248, 241, 0.85)'
  ctx.stroke()
}

/** The wheel with slices sized by points, turned so the pick sits under the pointer. */
function drawWheel(ctx: CanvasRenderingContext2D, ranking: StoryRankingRow[], winnerId: string | null, cx: number, cy: number, r: number) {
  const weights = ranking.map((row) => Math.max(row.points, 0))
  const sum = weights.reduce((total, w) => total + w, 0)
  const parts = sum > 0 ? weights.map((w) => w / sum) : ranking.map(() => 1 / Math.max(ranking.length, 1))
  const winner = Math.max(0, ranking.findIndex((row) => row.id === winnerId))
  const before = parts.slice(0, winner).reduce((total, p) => total + p, 0)
  let start = -Math.PI / 2 - (before + (parts[winner] ?? 1) / 2) * Math.PI * 2

  const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.4)
  glow.addColorStop(0, 'rgba(255, 208, 138, 0.35)')
  glow.addColorStop(1, 'rgba(255, 208, 138, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(cx - r * 1.4, cy - r * 1.4, r * 2.8, r * 2.8)

  ctx.beginPath()
  ctx.arc(cx, cy, r + 16, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 248, 241, 0.92)'
  ctx.fill()

  parts.forEach((part, i) => {
    if (part <= 0) return
    const end = start + part * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, start, end)
    ctx.closePath()
    ctx.globalAlpha = i === winner ? 1 : 0.78
    ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length]
    ctx.fill()
    ctx.globalAlpha = 1
    if (parts.length > 1) {
      ctx.lineWidth = 6
      ctx.strokeStyle = '#fffaf3'
      ctx.stroke()
    }
    start = end
  })

  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2)
  ctx.fillStyle = '#fffaf3'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.08, 0, Math.PI * 2)
  ctx.fillStyle = SUN
  ctx.fill()

  // Pointer
  ctx.beginPath()
  ctx.moveTo(cx - 36, cy - r - 58)
  ctx.lineTo(cx + 36, cy - r - 58)
  ctx.lineTo(cx, cy - r + 18)
  ctx.closePath()
  ctx.fillStyle = SUN
  ctx.fill()
  ctx.lineWidth = 6
  ctx.strokeStyle = '#fffaf3'
  ctx.stroke()
}

function drawRanking(
  ctx: CanvasRenderingContext2D,
  ranking: StoryRankingRow[],
  highlightId: string | null,
  top: number,
  rowHeight: number,
  limit: number,
  withBars: boolean,
) {
  const placed = ranking.map((row, i) => ({ ...row, place: i + 1 }))
  let rows = placed.slice(0, limit)
  // The pick always makes the list, even from far down the ranking.
  const highlighted = placed.find((row) => row.id === highlightId)
  if (highlighted && !rows.includes(highlighted)) rows = [...rows.slice(0, limit - 1), highlighted]
  const max = Math.max(1, ...placed.map((row) => row.points))
  const h = rowHeight - 18

  rows.forEach((row, i) => {
    const y = top + i * rowHeight
    const lit = row.id === highlightId
    const middle = y + h / 2

    roundedRect(ctx, MARGIN, y, INNER, h, Math.min(h / 2, 44))
    ctx.fillStyle = lit ? 'rgba(255, 248, 241, 0.96)' : 'rgba(255, 248, 241, 0.1)'
    ctx.fill()

    ctx.textAlign = 'left'
    ctx.fillStyle = lit ? PRIMARY : SUN
    ctx.font = `italic 600 ${withBars ? 64 : 48}px ${DISPLAY}`
    ctx.fillText(String(row.place), MARGIN + 40, middle + (withBars ? 22 : 17))

    ctx.textAlign = 'right'
    ctx.fillStyle = lit ? DARK : MUTED
    ctx.font = `600 ${withBars ? 36 : 30}px ${SANS}`
    ctx.fillText(row.pointsLabel, MARGIN + INNER - 40, middle + 12)
    const pointsWidth = ctx.measureText(row.pointsLabel).width

    const nameX = MARGIN + (withBars ? 130 : 110)
    const nameWidth = MARGIN + INNER - 40 - pointsWidth - 32 - nameX
    ctx.textAlign = 'left'
    ctx.fillStyle = lit ? DARK : INK
    ctx.font = `600 ${withBars ? 52 : 42}px ${DISPLAY}`
    ctx.fillText(fit(ctx, row.name, nameWidth), nameX, withBars ? middle + 4 : middle + 15)

    if (withBars) {
      roundedRect(ctx, nameX, middle + 24, nameWidth, 12, 6)
      ctx.fillStyle = lit ? 'rgba(43, 29, 23, 0.1)' : 'rgba(255, 248, 241, 0.15)'
      ctx.fill()
      const barWidth = Math.max(12, (nameWidth * Math.max(row.points, 0)) / max)
      const bar = ctx.createLinearGradient(nameX, 0, nameX + barWidth, 0)
      bar.addColorStop(0, '#ff7a5c')
      bar.addColorStop(1, PRIMARY)
      roundedRect(ctx, nameX, middle + 24, barWidth, 12, 6)
      ctx.fillStyle = bar
      ctx.fill()
    }
  })
}

async function draw(data: DecisionCardData, photo: HTMLImageElement | null): Promise<Blob> {
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
  ctx.fillText('roamie', MARGIN, 170)
  const logoWidth = ctx.measureText('roamie').width
  ctx.textAlign = 'right'
  ctx.fillStyle = MUTED
  ctx.font = `600 36px ${SANS}`
  ctx.fillText(fit(ctx, data.tripName, INNER - logoWidth - 48), CARD_WIDTH - MARGIN, 165)

  ctx.textAlign = 'left'
  ctx.fillStyle = SUN
  ctx.font = `600 38px ${SANS}`
  ctx.fillText(fit(ctx, data.eyebrow.toUpperCase(), INNER), MARGIN, 300)

  if (data.kind === 'wheel') {
    if (photo) drawPhoto(ctx, photo, MARGIN, 350, INNER, 700)
    else drawWheel(ctx, data.ranking, data.winnerId, CARD_WIDTH / 2, 730, 300)

    ctx.fillStyle = INK
    ctx.fillText(fitSize(ctx, data.title, INNER, (size) => `600 ${size}px ${DISPLAY}`, 160, 84), MARGIN - 6, 1215)
    if (data.subtitle) {
      ctx.fillStyle = MUTED
      ctx.font = `italic 500 56px ${DISPLAY}`
      ctx.fillText(fit(ctx, data.subtitle, INNER), MARGIN, 1292)
    }
    drawRanking(ctx, data.ranking, data.winnerId, 1360, 100, 4, false)
  } else {
    ctx.fillStyle = INK
    ctx.font = `600 112px ${DISPLAY}`
    const lines = wrap(ctx, data.title, INNER, 3)
    lines.forEach((line, i) => ctx.fillText(line, MARGIN - 4, 430 + i * 122))
    drawRanking(ctx, data.ranking, data.winnerId, 430 + lines.length * 122 + 30, 150, 6, true)
  }

  // Footer
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255, 248, 241, 0.85)'
  ctx.font = `600 36px ${SANS}`
  ctx.fillText(data.footer, CARD_WIDTH / 2, CARD_HEIGHT - 76)

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas_export_failed'))), 'image/png'),
  )
}

export async function renderDecisionCard(data: DecisionCardData): Promise<Blob> {
  const [photo] = await Promise.all([
    data.kind === 'wheel' && data.photoUrl ? loadImage(data.photoUrl) : null,
    // The canvas only uses web fonts once they are loaded.
    ...[`600 100px ${DISPLAY}`, `italic 600 100px ${DISPLAY}`, `600 40px ${SANS}`].map((font) => document.fonts.load(font).catch(() => undefined)),
  ])
  try {
    return await draw(data, photo)
  } catch (error) {
    // A photo that taints the canvas can't be exported: draw the wheel instead.
    if (photo) return draw(data, null)
    throw error
  }
}
