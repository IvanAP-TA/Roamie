import { useMemo, useSyncExternalStore } from 'react'

const noUpdates = () => () => {}
const today = () => new Date().toISOString().slice(0, 10)

/**
 * Today's date, for what a page shows by date (the coming months, the copyright year). While React adopts a
 * prerendered page (hydration) it is the day the page was built, stamped on <html data-built> by
 * scripts/prerender.mjs, so the first render matches the markup; React then re-renders with today's date.
 */
export function useToday(): Date {
  const day = useSyncExternalStore(
    noUpdates,
    today,
    () => (typeof document === 'undefined' ? today() : (document.documentElement.dataset.built ?? today())),
  )
  return useMemo(() => new Date(`${day}T12:00:00`), [day])
}
