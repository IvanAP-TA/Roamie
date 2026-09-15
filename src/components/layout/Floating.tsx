import { createPortal } from 'react-dom'

/**
 * Screen-anchored UI (floating buttons, bars, overlays) rendered straight into <body>. Inside a page, an ancestor with a
 * transform or filter — like the page's entrance animation — would anchor `position: fixed` to itself instead of the
 * screen, pushing the element down to the end of the page.
 */
export function Floating({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body)
}
