import { useEffect, useState } from 'react'

/**
 * For floating buttons that step aside while reading: true near the top of the page and as soon as the user scrolls
 * up, false while scrolling down. Small movements (a finger resting on the screen) change nothing.
 *
 * Listens in the capture phase to scrolls of any element, not just the window: on some phones the page scrolls <body>
 * (or another container) while window.scrollY stays at 0. Horizontal strips (chips, tabs) don't move vertically, so
 * they are ignored.
 */
export function useShowOnScrollUp({ top = 120, threshold = 8 }: { top?: number; threshold?: number } = {}) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const lastY = new WeakMap<object, number>()
    const positionOf = (target: EventTarget | null): [object, number] =>
      target instanceof Element && target !== document.documentElement && target !== document.body
        ? [target, target.scrollTop]
        : [document, Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop)]

    const onScroll = (event: Event) => {
      const [source, y] = positionOf(event.target)
      const previous = lastY.get(source) ?? 0
      const delta = y - previous
      if (delta === 0) return
      if (y <= top) setVisible(true)
      else if (delta > threshold) setVisible(false)
      else if (delta < -threshold) setVisible(true)
      else return
      lastY.set(source, y)
    }

    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => document.removeEventListener('scroll', onScroll, { capture: true })
  }, [top, threshold])

  return visible
}
