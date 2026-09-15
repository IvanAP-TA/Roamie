import { Outlet } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'

/**
 * Animation settings (respect the "reduce motion" system setting) for every page that animates with Framer Motion.
 * A route layout loaded on demand: the landing page doesn't use the library, so it never downloads it.
 */
export default function MotionShell() {
  return (
    <MotionConfig reducedMotion="user">
      <Outlet />
    </MotionConfig>
  )
}
