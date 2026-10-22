import { useEffect, useRef } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, type MotionValue } from 'framer-motion'
import { Compass } from 'lucide-react'
import { angleAtPointer, type RouletteEntry } from '@/lib/roulette'
import { playTick } from '@/lib/sound'
import { cn } from '@/lib/utils'

/**
 * The slices' colours: the sunset of Roamie's palette run once around the wheel (sun, coral, terracotta, plum, dusk),
 * every other slice a lighter tint of its tone, so neighbours stay apart without a rainbow. `count` is the number of
 * slices; the same colours are used by the legend and the story image.
 */
const SUNSET = ['#f4a950', '#ff7a5c', '#c24e27', '#8e3a4c', '#6b4a6e']
const PAPER = [255, 250, 243]

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const hex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t)

export function sliceColor(index: number, count: number): string {
  const t = count > 1 ? (index / count) * (SUNSET.length - 1) : 0
  const from = Math.floor(t)
  const tone = mix(rgb(SUNSET[from]), rgb(SUNSET[Math.min(from + 1, SUNSET.length - 1)]), t - from)
  return hex(index % 2 === 1 && count > 1 ? mix(tone, PAPER, 0.38) : tone)
}

/** Ink or white, whichever reads better on a slice. */
export function labelColor(fill: string): string {
  const [r, g, b] = rgb(fill).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.36 ? '#2b1d17' : '#fff8f2'
}

const C = 200
const R = 186
// Labels sit between the hub (26% of the wheel) and the rim lights.
const LABEL_RADIUS = R * 0.63
const LABEL_LENGTH = R * 0.6

const point = (angle: number, radius: number) => {
  const rad = (angle * Math.PI) / 180
  return [C + radius * Math.sin(rad), C - radius * Math.cos(rad)] as const
}

function slicePath(start: number, end: number) {
  if (end - start >= 359.999) return `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${C - 0.01} ${C - R} Z`
  const [x1, y1] = point(start, R)
  const [x2, y2] = point(end, R)
  return `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${end - start > 180 ? 1 : 0} 1 ${x2} ${y2} Z`
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

export function RouletteWheel({
  entries,
  rotation,
  onHubClick,
  hubDisabled,
  hubLabel,
  spinning,
}: {
  /** Only the slice geometry and the destination's id and name are drawn: the live wheel passes a recorded spin. */
  entries: (Pick<RouletteEntry, 'startAngle' | 'endAngle'> & { destination: { id: string; name: string } })[]
  rotation: MotionValue<number>
  onHubClick?: () => void
  hubDisabled?: boolean
  hubLabel: string
  spinning?: boolean
}) {
  const pointerTilt = useMotionValue(0)
  const lastSlice = useRef<number>(-1)

  // Tick + pointer flick every time a slice boundary passes under the pointer.
  useMotionValueEvent(rotation, 'change', (value) => {
    if (!spinning || entries.length < 2) return
    const angle = angleAtPointer(value)
    const index = entries.findIndex((e) => angle >= e.startAngle && angle < e.endAngle)
    if (index !== lastSlice.current) {
      lastSlice.current = index
      playTick()
      animate(pointerTilt, [-22, 0], { duration: 0.18, ease: 'easeOut' })
    }
  })

  useEffect(() => {
    lastSlice.current = -1
  }, [entries])

  return (
    // On phones the wheel also shrinks with the screen height, so the spin button stays above the dock.
    <div className="relative mx-auto aspect-square w-full max-w-[min(22rem,max(15rem,calc(100dvh-26rem)))] md:max-w-[27rem]">
      {/* a soft halo of the same sunset */}
      <div className="absolute inset-[8%] rounded-full bg-[conic-gradient(var(--sun),var(--coral),var(--primary),var(--dusk),var(--sun))] opacity-25 blur-3xl" />

      <motion.div style={{ rotate: rotation }} className="absolute inset-0 will-change-transform">
        <svg viewBox="0 0 400 400" className="size-full drop-shadow-[0_20px_36px_rgb(110_50_30/0.28)]" role="img">
          {/* the dial: a paper bezel with fine ticks, like a compass */}
          <circle cx={C} cy={C} r={R + 12} fill="var(--paper)" />
          <circle cx={C} cy={C} r={R + 12} fill="none" stroke="rgb(43 29 23 / 0.08)" strokeWidth="1" />
          {Array.from({ length: 72 }, (_, i) => {
            const major = i % 6 === 0
            const [x1, y1] = point(i * 5, R + 3)
            const [x2, y2] = point(i * 5, R + (major ? 10 : 7))
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgb(43 29 23 / 0.28)" strokeWidth={major ? 1.6 : 0.8} strokeLinecap="round" />
          })}
          {entries.map((entry, i) => {
            const span = entry.endAngle - entry.startAngle
            const mid = entry.startAngle + span / 2
            const color = sliceColor(i, entries.length)
            // Names run along the radius (more room than across a thin slice), flipped on the left
            // half so none is upside down when the wheel stops.
            const [lx, ly] = point(mid, LABEL_RADIUS)
            const angle = mid < 180 ? mid - 90 : mid + 90
            const arc = ((span * Math.PI) / 180) * LABEL_RADIUS
            // As big as the slice allows, then smaller (down to 10) so a long name fits whole ("Isole Lofoten"
            // rather than "Isole Lof…"); only a name that still doesn't fit is cut.
            const roomy = Math.max(11, Math.min(19, arc * 0.42))
            const fontSize = Math.max(10, Math.min(roomy, LABEL_LENGTH / (entry.destination.name.length * 0.56)))
            const maxChars = Math.max(5, Math.floor(LABEL_LENGTH / (fontSize * 0.56)))
            return (
              <g key={entry.destination.id}>
                <path d={slicePath(entry.startAngle, entry.endAngle)} fill={color} stroke="var(--paper)" strokeWidth={entries.length > 1 ? 2 : 0} />
                {span >= 10 && (
                  <text
                    x={lx}
                    y={ly}
                    transform={`rotate(${angle} ${lx} ${ly})`}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={labelColor(color)}
                    style={{ fontFamily: 'var(--font-display)', fontSize, fontWeight: 600, letterSpacing: '-0.01em' }}
                  >
                    {truncate(entry.destination.name, maxChars)}
                  </text>
                )}
              </g>
            )
          })}
          {/* a hairline where the slices meet the bezel, and a paper ring around the hub */}
          <circle cx={C} cy={C} r={R} fill="none" stroke="rgb(43 29 23 / 0.12)" strokeWidth="1" />
          <circle cx={C} cy={C} r={R * 0.3} fill="var(--paper)" opacity="0.92" />
        </svg>
      </motion.div>

      {/* the needle */}
      <motion.div
        style={{ rotate: pointerTilt, originY: 0.15 }}
        className="absolute top-[-3%] left-1/2 z-10 -ml-[14px] h-[50px] w-7 drop-shadow-[0_4px_6px_rgb(60_25_10/0.3)]"
      >
        <svg viewBox="0 0 28 50" className="size-full">
          <path d="M14 50 L5 13 L14 3 L23 13 Z" fill="var(--foreground)" />
          <path d="M14 50 L14 3 L23 13 Z" fill="rgb(255 255 255 / 0.12)" />
          <circle cx="14" cy="13" r="4.5" fill="var(--paper)" />
          <circle cx="14" cy="13" r="2" fill="var(--primary)" />
        </svg>
      </motion.div>

      {/* hub */}
      <motion.button
        type="button"
        onClick={onHubClick}
        disabled={hubDisabled}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        className="absolute top-1/2 left-1/2 z-10 flex size-[24%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full bg-paper text-foreground shadow-lift ring-1 ring-foreground/10 transition-opacity disabled:cursor-default disabled:opacity-90"
      >
        <Compass className={cn('size-6 text-primary', spinning && 'animate-spin')} strokeWidth={1.75} />
        <span className="font-display text-sm font-semibold">{hubLabel}</span>
      </motion.button>
    </div>
  )
}
