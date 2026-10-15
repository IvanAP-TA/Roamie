import { useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * A highlight (the element marked data-pill inside `ref`) that slides from the old option to the new one: a Web
 * Animation of its transform, which the compositor plays, so it stays smooth while the main thread is busy rendering
 * what the tap opened. Call the returned capture() when the option is tapped, before changing `key`; nothing is
 * measured on mount, so a screen opening with one of these doesn't force a layout of the whole page.
 */
export function useSlidingPill(ref: RefObject<HTMLElement | null>, key: unknown) {
  const from = useRef<DOMRect | null>(null)
  // Where the pill last was: on an option without one (the dock's raised action) the next pill slides in from there.
  const lastSeen = useRef<DOMRect | null>(null)

  useLayoutEffect(() => {
    const start = from.current
    from.current = null
    const pill = ref.current?.querySelector<HTMLElement>('[data-pill]')
    if (!start || !pill || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const end = pill.getBoundingClientRect()
    const dx = start.left - end.left
    const dy = start.top - end.top
    if (!dx && !dy) return
    pill.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
      duration: 420,
      easing: 'cubic-bezier(0.34, 1.3, 0.64, 1)',
    })
  }, [key, ref])

  return function capture() {
    const pill = ref.current?.querySelector<HTMLElement>('[data-pill]')
    if (pill) lastSeen.current = pill.getBoundingClientRect()
    from.current = lastSeen.current
  }
}
