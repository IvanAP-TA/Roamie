/**
 * The shareable passport image ("wrapped"-style story, 1080×1920), drawn on a canvas in the browser.
 * Nothing leaves the device: the PNG goes to the system share sheet or a download.
 */

export interface PassportCardData {
  eyebrow: string
  years: string | null
  countries: number
  countriesLabel: string
  stats: { value: string; label: string }[]
  highlights: { label: string; value: string }[]
  codes: string[]
  /** [lat, lng] */
  points: [number, number][]
  footer: string
}

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1920

export const DISPLAY = '"Fraunces Variable", Georgia, serif'
export const SANS = '"Instrument Sans Variable", system-ui, sans-serif'
export const INK = '#fff8f1'
export const SUN = '#ffd08a'

export function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

export function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function background(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT)
  sky.addColorStop(0, '#1f1418')
  sky.addColorStop(0.45, '#5a2a45')
  sky.addColorStop(0.8, '#b8475a')
  sky.addColorStop(1, '#ff8a65')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  const sun = ctx.createRadialGradient(860, 330, 20, 860, 330, 420)
  sun.addColorStop(0, 'rgba(255, 241, 201, 0.55)')
  sun.addColorStop(1, 'rgba(255, 241, 201, 0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // Layered hills, like the app's postcard scenes, kept subtle behind the text.
  const layers: [string, number[]][] = [
    ['rgba(110, 44, 72, 0.35)', [0, 1560, 200, 1480, 420, 1540, 640, 1450, 860, 1530, 1080, 1470]],
    ['rgba(74, 32, 56, 0.45)', [0, 1680, 260, 1610, 520, 1670, 780, 1600, 1080, 1650]],
    ['rgba(40, 20, 34, 0.55)', [0, 1800, 300, 1750, 620, 1790, 900, 1740, 1080, 1780]],
  ]
  for (const [color, pts] of layers) {
    ctx.beginPath()
    ctx.moveTo(pts[0], pts[1])
    for (let i = 2; i < pts.length; i += 2) {
      const [px, py] = [pts[i - 2], pts[i - 1]]
      const [x, y] = [pts[i], pts[i + 1]]
      ctx.quadraticCurveTo(px + (x - px) / 2, py - 30, x, y)
    }
    ctx.lineTo(CARD_WIDTH, CARD_HEIGHT)
    ctx.lineTo(0, CARD_HEIGHT)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  }
}

function dotMap(ctx: CanvasRenderingContext2D, points: [number, number][], x: number, y: number, w: number, h: number) {
  roundedRect(ctx, x, y, w, h, 44)
  ctx.fillStyle = 'rgba(255, 248, 241, 0.08)'
  ctx.fill()

  ctx.save()
  roundedRect(ctx, x, y, w, h, 44)
  ctx.clip()
  // Graticule every 30°, equirectangular between 75°N and 60°S.
  const [north, south] = [75, -60]
  const px = (lng: number) => x + ((lng + 180) / 360) * w
  const py = (lat: number) => y + ((north - Math.min(north, Math.max(south, lat))) / (north - south)) * h
  ctx.strokeStyle = 'rgba(255, 248, 241, 0.09)'
  ctx.lineWidth = 2
  for (let lng = -150; lng <= 150; lng += 30) {
    ctx.beginPath()
    ctx.moveTo(px(lng), y)
    ctx.lineTo(px(lng), y + h)
    ctx.stroke()
  }
  for (let lat = -30; lat <= 60; lat += 30) {
    ctx.beginPath()
    ctx.moveTo(x, py(lat))
    ctx.lineTo(x + w, py(lat))
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(255, 248, 241, 0.2)'
  ctx.beginPath()
  ctx.moveTo(x, py(0))
  ctx.lineTo(x + w, py(0))
  ctx.stroke()

  for (const [lat, lng] of points) {
    const cx = px(lng)
    const cy = py(lat)
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 34)
    glow.addColorStop(0, 'rgba(255, 208, 138, 0.55)')
    glow.addColorStop(1, 'rgba(255, 208, 138, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(cx - 34, cy - 34, 68, 68)
    ctx.beginPath()
    ctx.arc(cx, cy, 9, 0, Math.PI * 2)
    ctx.fillStyle = SUN
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(31, 20, 24, 0.6)'
    ctx.stroke()
  }
  ctx.restore()
}

export async function renderPassportCard(data: PassportCardData): Promise<Blob> {
  // The canvas only uses web fonts once they are loaded.
  await Promise.all(
    [`600 100px ${DISPLAY}`, `italic 500 100px ${DISPLAY}`, `600 40px ${SANS}`, `400 40px ${SANS}`].map((font) =>
      document.fonts.load(font).catch(() => undefined),
    ),
  )

  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unavailable')
  const margin = 96
  const inner = CARD_WIDTH - margin * 2

  background(ctx)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = INK

  // Header
  ctx.font = `italic 600 64px ${DISPLAY}`
  ctx.textAlign = 'left'
  ctx.fillText('roamie', margin, 170)
  if (data.years) {
    ctx.font = `600 38px ${SANS}`
    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(255, 248, 241, 0.75)'
    ctx.fillText(data.years, CARD_WIDTH - margin, 165)
  }

  // Headline number
  ctx.textAlign = 'left'
  ctx.fillStyle = SUN
  ctx.font = `600 36px ${SANS}`
  ctx.fillText(fit(ctx, data.eyebrow.toUpperCase(), inner), margin, 300)
  ctx.fillStyle = INK
  ctx.font = `600 340px ${DISPLAY}`
  ctx.fillText(String(data.countries), margin - 12, 620)
  ctx.font = `italic 500 84px ${DISPLAY}`
  ctx.fillText(fit(ctx, data.countriesLabel, inner), margin, 720)

  // Stats row
  const column = inner / Math.max(1, data.stats.length)
  data.stats.forEach((stat, i) => {
    const x = margin + column * i
    ctx.fillStyle = INK
    ctx.font = `600 104px ${DISPLAY}`
    ctx.fillText(fit(ctx, stat.value, column - 24), x, 880)
    ctx.fillStyle = 'rgba(255, 248, 241, 0.72)'
    ctx.font = `600 32px ${SANS}`
    ctx.fillText(fit(ctx, stat.label, column - 24), x, 930)
  })

  // Map of the stamps
  dotMap(ctx, data.points, margin, 990, inner, 380)

  // Country codes
  if (data.codes.length) {
    ctx.font = `600 34px ${SANS}`
    ctx.fillStyle = 'rgba(255, 248, 241, 0.85)'
    let line = ''
    let shown = 0
    for (const code of data.codes) {
      const next = line ? `${line} · ${code}` : code
      const rest = data.codes.length - shown - 1
      if (ctx.measureText(rest > 0 ? `${next} · +${rest}` : next).width > inner) break
      line = next
      shown++
    }
    if (shown < data.codes.length) line = `${line} · +${data.codes.length - shown}`
    ctx.fillText(line, margin, 1440)
  }

  // Highlights
  data.highlights.slice(0, 3).forEach((item, i) => {
    const y = 1540 + i * 110
    ctx.fillStyle = SUN
    ctx.font = `600 28px ${SANS}`
    ctx.fillText(fit(ctx, item.label.toUpperCase(), inner), margin, y)
    ctx.fillStyle = INK
    ctx.font = `600 52px ${DISPLAY}`
    ctx.fillText(fit(ctx, item.value, inner), margin, y + 58)
  })

  // Footer
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255, 248, 241, 0.8)'
  ctx.font = `600 34px ${SANS}`
  ctx.fillText(data.footer, CARD_WIDTH / 2, CARD_HEIGHT - 70)

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas_export_failed'))), 'image/png'),
  )
}
