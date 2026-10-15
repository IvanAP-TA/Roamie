import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * A page fading and rising in. A CSS animation of opacity and transform only: the compositor plays it, so it costs
 * the main thread nothing while the new page renders (a blur filter, or an animation library stepping each frame in
 * JavaScript, made slow phones stutter on every tab change). See .page-enter in index.css.
 */
export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('page-enter', className)}>{children}</div>
}

/** For the n-th item of a list that rises in one after the other: put it on the item with the .stagger-item class. */
export const staggerDelay = (index: number) => ({ '--i': Math.min(index, 10) }) as CSSProperties
