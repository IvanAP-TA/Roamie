import { useEffect, useRef } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, type MotionValue } from 'framer-motion'
import { FerrisWheel } from 'lucide-react'
import { angleAtPointer, type RouletteEntry } from '@/lib/roulette'
import { playTick } from '@/lib/sound'
import { cn } from '@/lib/utils'

export const SLICE_COLORS = ['#ff7a5c', '#f4a950', '#c24e27', '#d99ab8', '#6b4a6e', '#ffb38a', '#4f7d5b', '#e2603a', '#f9cf7e', '#8e3a4c']

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
      {/* glow */}
      <div className="absolute inset-[6%] rounded-full bg-[conic-gradient(var(--sun),var(--coral),var(--primary),var(--dusk),var(--sun))] opacity-40 blur-3xl" />

      <motion.div style={{ rotate: rotation }} className="absolute inset-0 will-change-transform">
        <svg viewBox="0 0 400 400" className="size-full drop-shadow-[0_24px_40px_rgb(140_60_30/0.35)]" role="img">
          <circle cx={C} cy={C} r={R + 12} fill="var(--paper)" />
          <circle cx={C} cy={C} r={R + 12} fill="none" stroke="rgb(0 0 0 / 0.06)" strokeWidth="1" />
          {entries.map((entry, i) => {
            const span = entry.endAngle - entry.startAngle
            const mid = entry.startAngle + span / 2
            const color = SLICE_COLORS[i % SLICE_COLORS.length]
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
                <path d={slicePath(entry.startAngle, entry.endAngle)} fill={color} stroke="var(--paper)" strokeWidth={entries.length > 1 ? 3 : 0} />
                {span >= 10 && (
                  <text
                    x={lx}
                    y={ly}
                    transform={`rotate(${angle} ${lx} ${ly})`}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    style={{ fontFamily: 'var(--font-display)', fontSize, fontWeight: 600, letterSpacing: '-0.01em' }}
                  >
                    {truncate(entry.destination.name, maxChars)}
                  </text>
                )}
              </g>
            )
          })}
          {/* rim lights */}
          {Array.from({ length: 24 }, (_, i) => {
            const [x, y] = point(i * 15, R + 6)
            return <circle key={i} cx={x} cy={y} r={2.6} fill={i % 2 ? 'var(--sun)' : 'var(--coral)'} className={cn(spinning && 'animate-pulse')} />
          })}
          <circle cx={C} cy={C} r={R} fill="url(#wheel-sheen)" pointerEvents="none" />
          <defs>
            <radialGradient id="wheel-sheen" cx="35%" cy="25%" r="80%">
              <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.12" />
            </radialGradient>
          </defs>
        </svg>
      </motion.div>

      {/* pointer */}
      <motion.div
        style={{ rotate: pointerTilt, originY: 0.2 }}
        className="absolute top-[-2%] left-1/2 z-10 -ml-[18px] h-[52px] w-9 drop-shadow-[0_6px_8px_rgb(80_30_10/0.35)]"
      >
        <svg viewBox="0 0 36 52" className="size-full">
          <path d="M18 52 L3 14 A16 16 0 1 1 33 14 Z" fill="var(--foreground)" />
          <circle cx="18" cy="16" r="6" fill="var(--sun)" />
        </svg>
      </motion.div>

      {/* hub */}
      <motion.button
        type="button"
        onClick={onHubClick}
        disabled={hubDisabled}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        className="absolute top-1/2 left-1/2 z-10 flex size-[26%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full bg-paper text-foreground shadow-lift ring-4 ring-white/50 transition-opacity disabled:cursor-default disabled:opacity-90"
      >
        <FerrisWheel className={cn('size-6 text-primary', spinning && 'animate-spin')} />
        <span className="font-display text-sm font-semibold">{hubLabel}</span>
      </motion.button>
    </div>
  )
}
