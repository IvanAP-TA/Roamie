import { useLayoutEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * A number that counts up to its value when it appears, and from the old value to the new one when it changes (a
 * filter on the Passport). Only this effect writes the text (React renders an empty span), frame by frame without a
 * React render per frame; with reduced motion it simply shows the value.
 */
export function CountUp({ value, className, duration = 700 }: { value: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(0)

  // Before paint: the text starts at the old value instead of flashing the new one first.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const from = shown.current
    shown.current = value
    if (from === value || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = String(value)
      return
    }
    el.textContent = String(from)
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // Ease out: fast at first, settling on the value.
      el.textContent = String(Math.round(from + (value - from) * (1 - (1 - t) ** 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return (
    <span ref={ref} className={cn('tabular-nums', className)} />
  )
}
