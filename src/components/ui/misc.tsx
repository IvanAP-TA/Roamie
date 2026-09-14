import * as React from 'react'
import { cn } from '@/lib/utils'
import { Scene } from '@/components/brand/Scene'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton-shimmer rounded-2xl', className)} />
}

export function EmptyState({
  seed,
  icon,
  title,
  body,
  children,
  className,
}: {
  seed: string
  icon?: React.ReactNode
  title: string
  body?: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <div className="w-44 -rotate-3 rounded-[1.5rem] bg-paper p-2 shadow-lift transition-transform duration-500 ease-[var(--ease-spring)] hover:rotate-2">
        <Scene seed={seed} className="aspect-[4/3] rounded-[1.1rem]">
          {icon && <span className="text-white drop-shadow-md [&_svg]:size-10">{icon}</span>}
        </Scene>
      </div>
      <h2 className="mt-7 text-2xl">{title}</h2>
      {body && <p className="mt-2 max-w-sm text-muted-foreground">{body}</p>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}

export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-300',
        checked ? 'bg-primary' : 'bg-foreground/15',
      )}
    >
      <span
        className={cn(
          'inline-block size-5 rounded-full bg-white shadow-soft transition-transform duration-300 ease-[var(--ease-spring)]',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

export function Chip({
  active,
  onClick,
  children,
  className,
  size = 'default',
}: {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
  size?: 'default' | 'sm'
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium transition-all duration-200 active:scale-95 [&_svg]:size-3.5',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
        active
          ? 'border-transparent bg-foreground text-background shadow-soft'
          : 'border-border bg-[var(--glass)] text-foreground/80 hover:bg-[var(--glass-strong)]',
        className,
      )}
    >
      {children}
    </button>
  )
}
