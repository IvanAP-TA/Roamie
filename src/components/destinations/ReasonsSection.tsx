import { useState } from 'react'
import { Loader2, Lock, Plus, ThumbsUp, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useAddReason, useDeleteReason, useToggleReasonLike } from '@/hooks/useReasons'
import { useTripContext } from '@/hooks/useTripContext'
import { REASON_MAX_LENGTH, REASONS_PER_MEMBER, sortReasons } from '@/lib/reasons'
import { votesHidden } from '@/lib/secretVoting'
import { rpcErrorCode } from '@/lib/supabase'
import type { Destination } from '@/lib/types'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** "Perché andarci": short reasons members write to win the group over, with likes (hidden during a secret vote). */
export function ReasonsSection({ destination: d, className }: { destination: Destination; className?: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { trip, members, isOwner } = useTripContext()
  const hidden = votesHidden(trip)
  const add = useAddReason(trip.id, d.id)
  const remove = useDeleteReason(trip.id)
  const like = useToggleReasonLike(trip.id)
  const [text, setText] = useState('')

  const reasons = sortReasons(d.reasons ?? [], hidden)
  const mine = reasons.filter((r) => r.user_id === user?.id).length
  const left = REASONS_PER_MEMBER - mine
  const open = d.status === 'proposed'
  const profileOf = (userId: string) => members.find((m) => m.user_id === userId)?.profile ?? null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = text.trim()
    if (!value || add.isPending) return
    add.mutate(value, {
      onSuccess: () => setText(''),
      onError: (err) => toast.error(rpcErrorCode(err as Error) === 'reasons_limit' ? t('reasons.limit') : t('errors.generic')),
    })
  }

  return (
    <section className={cn('space-y-3', className)} aria-labelledby={`reasons-${d.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={`reasons-${d.id}`} className="text-xl">
          {t('reasons.title')}
        </h3>
        {hidden && reasons.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="size-3.5" />
            {t('reasons.hiddenLikes')}
          </span>
        )}
      </div>

      {reasons.length === 0 ? (
        <p className="rounded-2xl bg-foreground/[0.04] px-4 py-4 text-center text-sm text-muted-foreground">{t('reasons.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {reasons.map((r) => {
            const liked = r.likes.some((l) => l.user_id === user?.id)
            const author = profileOf(r.user_id)
            return (
              <li
                key={r.id}
                className="group flex items-center gap-2 rounded-[1.25rem] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--sun)_16%,transparent),color-mix(in_oklab,var(--coral)_9%,transparent))] py-2 pr-2 pl-4"
              >
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="leading-snug break-words">{r.text}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserAvatar profile={author} className="size-5 text-[0.5rem]" />
                    <span className="truncate">{author?.display_name?.split(' ')[0] ?? t('group.formerMember')}</span>
                  </p>
                </div>
                {(r.user_id === user?.id || isOwner) && (
                  <button
                    type="button"
                    onClick={() => remove.mutate(r.id, { onError: () => toast.error(t('errors.generic')) })}
                    aria-label={t('reasons.delete')}
                    className="rounded-full p-2 text-muted-foreground opacity-60 transition hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  aria-pressed={liked}
                  aria-label={t('reasons.like')}
                  title={t('reasons.like')}
                  disabled={like.isPending && like.variables?.reasonId === r.id}
                  onClick={() => like.mutate({ reasonId: r.id, liked }, { onError: () => toast.error(t('errors.generic')) })}
                  className={cn(
                    'flex h-10 min-w-12 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold tabular-nums transition active:scale-90',
                    liked
                      ? 'bg-[linear-gradient(135deg,var(--coral),var(--primary))] text-white shadow-glow'
                      : 'bg-[var(--glass-strong)] text-muted-foreground hover:text-foreground',
                  )}
                >
                  <ThumbsUp className={cn('size-4', liked && 'fill-current')} />
                  {!hidden && r.likes.length > 0 && r.likes.length}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {open &&
        (left > 0 ? (
          <form onSubmit={submit} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Input
                value={text}
                maxLength={REASON_MAX_LENGTH}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('reasons.placeholder')}
                aria-label={t('reasons.placeholder')}
                className="flex-1"
              />
              <Button type="submit" variant="glass" disabled={!text.trim() || add.isPending}>
                {add.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                {t('reasons.add')}
              </Button>
            </div>
            {mine > 0 && <p className="px-1 text-xs text-muted-foreground">{t('reasons.left', { count: left })}</p>}
          </form>
        ) : (
          <p className="px-1 text-xs text-muted-foreground">{t('reasons.limit')}</p>
        ))}
    </section>
  )
}
