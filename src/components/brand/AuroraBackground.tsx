import { cn } from '@/lib/utils'

/**
 * Slow-drifting sunset blobs + film grain. The blobs are soft radial gradients rather than blurred circles
 * (a large blur filter is expensive to paint), and on touch devices they stand still (see index.css).
 */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('grain pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}>
      <div
        className="aurora-blob"
        style={{
          background: 'radial-gradient(closest-side, var(--aurora-1), transparent)',
          width: '72vmax',
          height: '72vmax',
          top: '-30vmax',
          left: '-24vmax',
          animation: 'drift-a 26s ease-in-out infinite',
        }}
      />
      <div
        className="aurora-blob"
        style={{
          background: 'radial-gradient(closest-side, var(--aurora-2), transparent)',
          width: '58vmax',
          height: '58vmax',
          top: '-12vmax',
          right: '-30vmax',
          opacity: 0.42,
          animation: 'drift-b 32s ease-in-out infinite',
        }}
      />
      <div
        className="aurora-blob"
        style={{
          background: 'radial-gradient(closest-side, var(--aurora-3), transparent)',
          width: '52vmax',
          height: '52vmax',
          bottom: '-26vmax',
          left: '-10vmax',
          opacity: 0.4,
          animation: 'drift-c 30s ease-in-out infinite',
        }}
      />
      <div
        className="aurora-blob"
        style={{
          background: 'radial-gradient(closest-side, var(--aurora-4), transparent)',
          width: '40vmax',
          height: '40vmax',
          bottom: '-18vmax',
          right: '-14vmax',
          opacity: 0.3,
          animation: 'drift-a 36s ease-in-out infinite reverse',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,transparent_30%,var(--background)_78%)]" />
    </div>
  )
}
