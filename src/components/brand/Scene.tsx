import { cn, hashIndex } from '@/lib/utils'

/**
 * Hand-drawn "postcard" scenes made of gradients and layered silhouettes.
 * Used on the landing page and as the fallback when no relevant photo exists
 * (never a random unrelated image).
 */
const PALETTES = [
  { sky: ['#ffcf9f', '#ff8a65', '#b8475a'], sun: '#fff1c9', layers: ['#c4566a', '#9a3d58', '#6e2c48'] }, // sunset sea
  { sky: ['#ffe2b0', '#f6ae63', '#d9713b'], sun: '#fff6de', layers: ['#e0914f', '#c46f37', '#8f4a28'] }, // desert
  { sky: ['#f9d9c6', '#e7a6a9', '#8c6b9a'], sun: '#fff0e4', layers: ['#9c7aa6', '#6f5584', '#4a3a61'] }, // lilac peaks
  { sky: ['#fde3b5', '#f3b27a', '#6f9a86'], sun: '#fff5d8', layers: ['#7fa58c', '#557f69', '#355a4b'] }, // green hills
  { sky: ['#ffd6c2', '#ff9f8a', '#e0605a'], sun: '#fff2e0', layers: ['#d4695f', '#a94b4f', '#7a3342'] }, // coral coast
] as const

const SHAPES = {
  waves: [
    'M0 62 C 15 58, 30 58, 50 62 S 85 66, 100 60 V100 H0Z',
    'M0 72 C 20 68, 35 69, 50 72 S 80 76, 100 70 V100 H0Z',
    'M0 84 C 18 80, 38 81, 55 84 S 85 87, 100 82 V100 H0Z',
  ],
  peaks: [
    'M0 64 L18 44 L30 56 L48 34 L66 58 L80 46 L100 62 V100 H0Z',
    'M0 74 L22 58 L40 70 L58 52 L76 70 L100 60 V100 H0Z',
    'M0 86 C 25 80, 50 84, 70 80 S 95 82, 100 84 V100 H0Z',
  ],
  dunes: [
    'M0 66 C 25 52, 45 52, 65 62 S 90 70, 100 60 V100 H0Z',
    'M0 76 C 20 70, 40 66, 60 74 S 88 82, 100 72 V100 H0Z',
    'M0 88 C 30 82, 60 84, 100 86 V100 H0Z',
  ],
} as const

type ShapeKind = keyof typeof SHAPES
const KINDS: ShapeKind[] = ['waves', 'peaks', 'dunes']

export function Scene({
  seed,
  className,
  children,
}: {
  seed: string
  className?: string
  children?: React.ReactNode
}) {
  // Numeric seeds ("0".."4") pick a preset deterministically (used by the cover picker).
  const preset = /^\d+$/.test(seed) ? Number(seed) : null
  const palette = PALETTES[preset ?? hashIndex(seed, PALETTES.length)] ?? PALETTES[0]
  const kind = KINDS[preset !== null ? preset % KINDS.length : hashIndex(seed + '·', KINDS.length)]
  const id = `scene-${hashIndex(seed, 1e6)}`

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={palette.sky[0]} />
            <stop offset="0.55" stopColor={palette.sky[1]} />
            <stop offset="1" stopColor={palette.sky[2]} />
          </linearGradient>
          <radialGradient id={`${id}-sun`}>
            <stop offset="0.6" stopColor={palette.sun} />
            <stop offset="1" stopColor={palette.sun} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${id}-sky)`} />
        <circle cx={30 + hashIndex(seed, 40)} cy="52" r="20" fill={`url(#${id}-sun)`} />
        {SHAPES[kind].map((d, i) => (
          <path key={i} d={d} fill={palette.layers[i]} opacity={i === 0 ? 0.75 : 1} />
        ))}
      </svg>
      {children && <div className="relative flex size-full items-center justify-center">{children}</div>}
    </div>
  )
}
