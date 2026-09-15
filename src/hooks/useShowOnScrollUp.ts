import { useEffect, useState } from 'react'

/**
 * For floating buttons that step aside while reading: true near the top of the page and as soon as the user scrolls
 * up, false while scrolling down. Small movements (a finger resting on the screen) change nothing. Scroll events
 * already arrive at most once a frame, and setting the same value again doesn't re-render.
 */
export function useShowOnScrollUp({ top = 120, threshold = 8 }: { top?: number; threshold?: number } = {}) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    let lastY = window.scrollY

    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastY
      if (y <= top) setVisible(true)
      else if (delta > threshold) setVisible(false)
      else if (delta < -threshold) setVisible(true)
      else return
      lastY = y
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [top, threshold])

  return visible
}
