import { Avatar as AvatarPrimitive } from 'radix-ui'
import { cn, hashIndex, initials, safeAvatarUrl } from '@/lib/utils'
import type { ProfileSummary } from '@/lib/types'

const TINTS = [
  'from-[#ffb38a] to-[#e2603a]',
  'from-[#f9cf7e] to-[#e79a3c]',
  'from-[#d99ab8] to-[#8e4f7a]',
  'from-[#9cc9a4] to-[#4f7d5b]',
  'from-[#ff9a8a] to-[#c24e5a]',
]

export function UserAvatar({
  profile,
  className,
  ring = false,
}: {
  profile: ProfileSummary | null | undefined
  className?: string
  ring?: boolean
}) {
  const name = profile?.display_name ?? ''
  const avatarUrl = safeAvatarUrl(profile?.avatar_url)
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative inline-flex size-9 shrink-0 overflow-hidden rounded-full',
        ring && 'ring-2 ring-[var(--paper)]',
        className,
      )}
    >
      {avatarUrl && (
        <AvatarPrimitive.Image
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback
        delayMs={avatarUrl ? 400 : 0}
        className={cn(
          'flex size-full items-center justify-center bg-gradient-to-br text-[0.7em] font-semibold text-white',
          TINTS[hashIndex(name || 'x', TINTS.length)],
        )}
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

export function AvatarStack({
  profiles,
  max = 4,
  className,
  size = 'size-8',
}: {
  profiles: (ProfileSummary | null)[]
  max?: number
  className?: string
  size?: string
}) {
  const shown = profiles.slice(0, max)
  const extra = profiles.length - shown.length
  return (
    <div className={cn('flex -space-x-2.5', className)}>
      {shown.map((p, i) => (
        <UserAvatar key={i} profile={p} ring className={cn(size, 'text-sm')} />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            size,
            'flex items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground ring-2 ring-[var(--paper)]',
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  )
}
