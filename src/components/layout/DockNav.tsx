import { useRef, useState } from 'react'
import { NavLink, matchPath, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { useSlidingPill } from '@/hooks/useSlidingPill'
import { cn } from '@/lib/utils'

export interface DockItem {
  label: string
  icon: LucideIcon
  /** Route target. Omit and pass onClick for an action button. */
  to?: string
  end?: boolean
  onClick?: () => void
  /** Raised, gradient "hero" action (e.g. the roulette). */
  primary?: boolean
}

const itemClass =
  'group relative flex w-full flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 outline-none focus-visible:outline-2 md:size-16 md:justify-center'

function PrimaryVisual({ item, active }: { item: DockItem; active: boolean }) {
  return (
    <>
      <span
        className={cn(
          '-mt-7 flex size-14 items-center justify-center rounded-full text-white shadow-glow transition-transform duration-300 ease-[var(--ease-spring)] md:mt-0',
          'bg-[conic-gradient(from_200deg,var(--sun),var(--coral),var(--primary),var(--dusk),var(--sun))]',
          'ring-4 ring-[var(--background)] group-active:scale-90 md:ring-0',
          active && 'scale-105',
        )}
      >
        <item.icon className="size-6 drop-shadow transition-transform duration-700 group-hover:rotate-180" strokeWidth={2.2} />
      </span>
      <span className={cn('text-[0.66rem] font-semibold md:sr-only', active ? 'text-primary' : 'text-muted-foreground')}>
        {item.label}
      </span>
    </>
  )
}

function RegularVisual({ item, active }: { item: DockItem; active: boolean }) {
  return (
    <>
      {active && <span data-pill className="absolute inset-0 rounded-2xl bg-accent/80" />}
      <item.icon
        className={cn(
          'relative size-[1.35rem] transition-transform duration-300 group-active:scale-90',
          active ? 'text-accent-foreground' : 'text-muted-foreground group-hover:text-foreground',
        )}
        strokeWidth={active ? 2.3 : 1.9}
      />
      <span className={cn('relative text-[0.66rem] font-semibold', active ? 'text-accent-foreground' : 'text-muted-foreground')}>
        {item.label}
      </span>
    </>
  )
}

/**
 * Mobile: floating glass dock in the thumb zone. ≥768px: vertical rail on the left.
 *
 * The tapped tab lights up at once, before the router has rendered the new page (navigation is a transition, which
 * on a slow phone takes a few hundred milliseconds), and the highlight slides over on the compositor (useSlidingPill),
 * so it stays smooth while the main thread builds the page.
 */
export function DockNav({ items }: { items: DockItem[] }) {
  const { pathname } = useLocation()
  const [tapped, setTapped] = useState<{ index: number; from: string } | null>(null)
  const routeIndex = items.findIndex((item) => item.to && matchPath({ path: item.to, end: item.end ?? false }, pathname))
  // The tap counts until the location changes; from then on the route says which tab is active.
  const active = tapped && tapped.from === pathname ? tapped.index : routeIndex

  const listRef = useRef<HTMLUListElement>(null)
  const capturePill = useSlidingPill(listRef, active)

  return (
    <nav
      className={cn(
        'fixed z-40',
        'inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)]',
        'md:inset-x-auto md:top-1/2 md:bottom-auto md:left-5 md:-translate-y-1/2',
      )}
    >
      <ul
        ref={listRef}
        className="glass-strong mx-auto flex max-w-md items-center justify-around gap-1 rounded-[1.75rem] px-2 py-2 md:flex-col md:gap-2 md:rounded-[2rem] md:py-3"
      >
        {items.map((item, index) => {
          const Visual = item.primary ? PrimaryVisual : RegularVisual
          const isActive = index === active
          return (
            <li key={item.to ?? item.label} className="flex flex-1 justify-center md:flex-none">
              {item.to ? (
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={(event) => {
                    if (!event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && index !== active) {
                      capturePill()
                      setTapped({ index, from: pathname })
                    }
                    item.onClick?.()
                  }}
                  className={itemClass}
                >
                  <Visual item={item} active={isActive} />
                </NavLink>
              ) : (
                <button type="button" onClick={item.onClick} className={itemClass}>
                  <Visual item={item} active={false} />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
