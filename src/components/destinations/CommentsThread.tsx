import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, SendHorizontal, Trash2, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useAddComment, useComments, useDeleteComment } from '@/hooks/useDestinations'
import { useTripContext } from '@/hooks/useTripContext'
import { encodeMentions, matchesMention, mentionQuery, mentionsUser, parseComment, type PickedMention } from '@/lib/mentions'
import { rpcErrorCode } from '@/lib/supabase'
import type { ProfileSummary } from '@/lib/types'
import { UserAvatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/misc'
import { cn, isTouchDevice, timeAgo } from '@/lib/utils'

/** Comment text with mentions shown by the member's current name. */
function CommentText({ content }: { content: string }) {
  const { t } = useTranslation()
  const { members } = useTripContext()
  return (
    <p className="mt-0.5 text-[0.95rem] leading-relaxed break-words whitespace-pre-line">
      {parseComment(content).map((part, i) =>
        part.type === 'text' ? (
          <Fragment key={i}>{part.text}</Fragment>
        ) : (
          <span key={i} className="font-semibold text-primary">
            @{part.type === 'all' ? 'all' : (members.find((m) => m.user_id === part.userId)?.profile?.display_name ?? t('group.formerMember'))}
          </span>
        ),
      )}
    </p>
  )
}

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
          const forMe = !mine && Boolean(user) && mentionsUser(c.content, user!.id)
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
                    mine ? 'bg-accent/70' : forMe ? 'bg-primary/10 ring-1 ring-primary/25' : 'bg-foreground/[0.05]',
                  )}
                >
                  <p className="text-xs font-semibold">
                    {c.author?.display_name ?? t('group.unknown')}
                    <span className="ml-2 font-normal text-muted-foreground">{timeAgo(c.created_at, i18n.resolvedLanguage ?? 'en')}</span>
                  </p>
                  <CommentText content={c.content} />
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

interface Suggestion {
  id: string
  label: string
  profile: ProfileSummary | null
}

const EVERYONE = 'all'

export function CommentComposer({ destinationId, tripId, onSent }: { destinationId: string; tripId: string; onSent?: () => void }) {
  const { t } = useTranslation()
  const { profile, user } = useAuth()
  const { members } = useTripContext()
  const add = useAddComment(tripId, destinationId)
  const [value, setValue] = useState('')
  const [query, setQuery] = useState<{ start: number; end: number; text: string } | null>(null)
  const [active, setActive] = useState(0)
  // Names picked from the suggestions, turned into mention tokens when sending.
  const picked = useRef<PickedMention[]>([])
  const ref = useRef<HTMLTextAreaElement>(null)
  const listId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    // scrollHeight leaves out the borders: without them one line would overflow and show a scrollbar.
    const borders = el.offsetHeight - el.clientHeight
    el.style.height = `${Math.min(el.scrollHeight + borders, 128)}px`
  }, [value])

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!query) return []
    const everyone = EVERYONE.startsWith(query.text.toLowerCase()) ? [{ id: EVERYONE, label: EVERYONE, profile: null }] : []
    const people = members
      .filter((m) => m.user_id !== user?.id && m.profile?.display_name && matchesMention(m.profile.display_name, query.text))
      .map((m) => ({ id: m.user_id, label: m.profile!.display_name!, profile: m.profile }))
    return [...everyone, ...people].slice(0, 6)
  }, [query, members, user?.id])

  const track = (el: HTMLTextAreaElement) => {
    setQuery(mentionQuery(el.value, el.selectionStart ?? el.value.length))
    setActive(0)
  }

  const choose = (suggestion: Suggestion) => {
    if (!query) return
    const insert = `@${suggestion.label} `
    if (suggestion.id !== EVERYONE) {
      picked.current = [...picked.current.filter((p) => p.id !== suggestion.id), { id: suggestion.id, label: suggestion.label }]
    }
    setValue(value.slice(0, query.start) + insert + value.slice(query.end))
    setQuery(null)
    const caret = query.start + insert.length
    setTimeout(() => {
      ref.current?.focus()
      ref.current?.setSelectionRange(caret, caret)
    }, 0)
  }

  const send = () => {
    const content = encodeMentions(value.trim(), picked.current)
    if (!content || add.isPending) return
    add.mutate(content, {
      onSuccess: () => {
        setValue('')
        setQuery(null)
        picked.current = []
        onSent?.()
      },
      onError: (err) => toast.error(rpcErrorCode(err as Error) === 'mention_all_limited' ? t('comments.allLimited') : t('errors.generic')),
    })
  }

  const open = suggestions.length > 0

  return (
    <form
      className="relative flex items-end gap-2 pb-1"
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('comments.mentionList')}
          className="glass-strong absolute inset-x-0 bottom-full z-10 mb-2 max-h-64 overflow-y-auto rounded-2xl p-1.5 shadow-lift"
        >
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                // Keep the focus in the text box.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition',
                  i === active ? 'bg-foreground/[0.07]' : 'hover:bg-foreground/[0.04]',
                )}
              >
                {s.id === EVERYONE ? (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Users className="size-4" />
                  </span>
                ) : (
                  <UserAvatar profile={s.profile} className="size-7 text-[0.6rem]" />
                )}
                <span className="min-w-0 flex-1 truncate font-medium">@{s.label}</span>
                {s.id === EVERYONE && <span className="shrink-0 text-xs text-muted-foreground">{t('comments.everyone')}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <UserAvatar profile={profile} className="mb-1.5 hidden size-8 text-xs sm:flex" />
      <textarea
        ref={ref}
        rows={1}
        value={value}
        maxLength={2000}
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        onChange={(e) => {
          setValue(e.target.value)
          track(e.target)
        }}
        onClick={(e) => track(e.currentTarget)}
        onBlur={() => setQuery(null)}
        onKeyDown={(e) => {
          if (open) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length)
              return
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault()
              choose(suggestions[Math.min(active, suggestions.length - 1)])
              return
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              setQuery(null)
              return
            }
          }
          if (e.key === 'Enter' && !e.shiftKey && !isTouchDevice()) {
            e.preventDefault()
            send()
          }
        }}
        placeholder={t('comments.placeholder')}
        className="scrollbar-thin max-h-32 min-h-11 flex-1 resize-none rounded-[1.4rem] border border-input bg-[var(--paper)] px-4 py-2.5 text-base outline-none focus:border-ring"
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
