import { lazy, Suspense, useState } from 'react'
import type { SheetProps } from './sheet-panel'

const loadPanel = () => import('./sheet-panel')
const SheetPanel = lazy(loadPanel)

/** Fetches the sheet's code (the drawer and dialog libraries) ahead of time, when the browser is idle. */
export function preloadSheet() {
  void loadPanel().catch(() => {})
}

/**
 * Mobile: draggable bottom sheet (thumb zone). ≥768px: centred glass dialog.
 *
 * Built the first time it opens, then kept (so it can animate closed). A page holds several sheets and most are
 * never opened; a mounted drawer, even closed, reads the scroll position on mount, which makes the browser lay out
 * the whole new page in the middle of a tab change. Its code (the drawer and dialog libraries) isn't part of the
 * first download either: it comes with the first sheet opened, or earlier through preloadSheet().
 */
export function Sheet(props: SheetProps) {
  const [used, setUsed] = useState(props.open)
  if (props.open && !used) setUsed(true)
  if (!used) return null
  return (
    <Suspense fallback={null}>
      <SheetPanel {...props} />
    </Suspense>
  )
}
