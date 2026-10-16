import { useEffect, useState } from 'react'

/** Whether the page is scrolled past `threshold` pixels. With `enabled` false it doesn't listen and stays false. */
export function useScrolled(threshold = 8, enabled = true) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    if (!enabled) return
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold, enabled])
  return scrolled
}
