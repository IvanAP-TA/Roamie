import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return <img src="/favicon.svg" alt="" className={cn('size-8 rounded-[30%] shadow-soft', className)} />
}

export function Logo({ className, to = '/' }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn('group inline-flex items-center gap-2.5', className)} aria-label="Roamie">
      <LogoMark className="transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-rotate-6 group-active:scale-90" />
      <span className="font-display text-[1.6rem] leading-none font-medium tracking-tight display-wonk">roamie</span>
    </Link>
  )
}
