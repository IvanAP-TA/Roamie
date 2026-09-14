import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, SendHorizontal, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useAddComment, useComments, useDeleteComment } from '@/hooks/useDestinations'
import { UserAvatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/misc'
import { cn, isTouchDevice, timeAgo } from '@/lib/utils'

export function CommentsThread({ destinationId, tripId, isOwner }: { destinationId: string; tripId: string; isOwner: boolean }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { data: comments, isLoading } = useComments(destinationId)
  const remove = useDeleteComment(tripId, destinationId)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14" />
        <Skeleton className="h-14 w-4/5" />
      </div>
    )
  }

  if (!comments?.length) {
    return <p className="rounded-2xl bg-foreground/[0.04] px-4 py-5 text-center text-sm text-muted-foreground">{t('comments.empty')}</p>
  }

  return (
    <ul className="space-y-3">
      <AnimatePresence initial={false}>
        {comments.map((c) => {
          const mine = c.user_id === user?.id
          return (
            <motion.li
              key={c.id}
              layout
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20 }}
              className="group flex gap-2.5"
            >
              <UserAvatar profile={c.author} className="mt-1 size-8 text-xs" />
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    'rounded-[1.25rem] rounded-tl-md px-4 py-2.5',
                    mine ? 'bg-accent/70' : 'bg-foreground/[0.05]',
                  )}
                >
                  <p className="text-xs font-semibold">
                    {c.author?.display_name ?? t('group.unknown')}
                    <span className="ml-2 font-normal text-muted-foreground">{timeAgo(c.created_at, i18n.resolvedLanguage ?? 'en')}</span>
                  </p>
                  <p className="mt-0.5 text-[0.95rem] leading-relaxed break-words whitespace-pre-line">{c.content}</p>
                </div>
              </div>
              {(mine || isOwner) && (
                <button
                  type="button"
                  onClick={() => remove.mutate(c.id, { onError: () => toast.error(t('errors.generic')) })}
                  aria-label={t('comments.delete')}
                  className="self-center rounded-full p-2 text-muted-foreground opacity-60 transition hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}

export function CommentComposer({ destinationId, tripId, onSent }: { destinationId: string; tripId: string; onSent?: () => void }) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const add = useAddComment(tripId, destinationId)
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [value])

  const send = () => {
    const content = value.trim()
    if (!content || add.isPending) return
    add.mutate(content, {
      onSuccess: () => {
        setValue('')
        onSent?.()
      },
      onError: () => toast.error(t('errors.generic')),
    })
  }

  return (
    <form
      className="flex items-end gap-2 pb-1"
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      <UserAvatar profile={profile} className="mb-1.5 hidden size-8 text-xs sm:flex" />
      <textarea
        ref={ref}
        rows={1}
        value={value}
        maxLength={2000}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !isTouchDevice()) {
            e.preventDefault()
            send()
          }
        }}
        placeholder={t('comments.placeholder')}
        className="max-h-32 min-h-11 flex-1 resize-none rounded-[1.4rem] border border-input bg-[var(--paper)] px-4 py-2.5 text-base outline-none focus:border-ring"
      />
      <motion.button
        type="submit"
        whileTap={{ scale: 0.85, rotate: -12 }}
        disabled={!value.trim() || add.isPending}
        aria-label={t('comments.send')}
        className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--coral),var(--primary))] text-white shadow-glow transition disabled:opacity-40 disabled:shadow-none"
      >
        {add.isPending ? <Loader2 className="size-5 animate-spin" /> : <SendHorizontal className="size-5" />}
      </motion.button>
    </form>
  )
}
