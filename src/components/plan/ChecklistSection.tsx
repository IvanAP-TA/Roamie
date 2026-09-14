import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Backpack, CalendarCheck, Check, Eye, Plus, UserPlus, X, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useChecklist, useChecklistMutations } from '@/hooks/usePlan'
import { useTripContext } from '@/hooks/useTripContext'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { CHECKLIST_KINDS, type ChecklistItem, type ChecklistKind } from '@/lib/types'
import { cn } from '@/lib/utils'

const KIND_ICON: Record<ChecklistKind, LucideIcon> = { book: CalendarCheck, pack: Backpack }
const NOBODY = 'nobody'

function AssigneePicker({ item, canEdit, onChange }: { item: ChecklistItem; canEdit: boolean; onChange: (userId: string | null) => void }) {
  const { t } = useTranslation()
  const { members } = useTripContext()
  const assignee = members.find((m) => m.user_id === item.assignee_id)
  const name = assignee?.profile?.display_name ?? ''

  if (!canEdit) {
    return assignee ? <UserAvatar profile={assignee.profile} className="size-7 text-[0.6rem]" /> : null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={assignee ? t('checklist.assignedTo', { name }) : t('checklist.assign')}
        className="flex size-9 shrink-0 items-center justify-center rounded-full transition active:scale-90"
      >
        {assignee ? (
          <UserAvatar profile={assignee.profile} className="size-7 text-[0.6rem]" />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full border-2 border-dashed border-foreground/20 text-muted-foreground">
            <UserPlus className="size-3.5" />
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuRadioGroup value={item.assignee_id ?? NOBODY} onValueChange={(value) => onChange(value === NOBODY ? null : value)}>
          <DropdownMenuRadioItem value={NOBODY}>
            <span className="flex size-6 items-center justify-center rounded-full border-2 border-dashed border-foreground/20" />
            {t('checklist.nobody')}
          </DropdownMenuRadioItem>
          {members.map((member) => (
            <DropdownMenuRadioItem key={member.user_id} value={member.user_id}>
              <UserAvatar profile={member.profile} className="size-6 text-[0.55rem]" />
              <span className="truncate">{member.profile?.display_name ?? t('group.unknown')}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ChecklistGroup({ kind, items }: { kind: ChecklistKind; items: ChecklistItem[] }) {
  const { t } = useTranslation()
  const { trip, canEdit } = useTripContext()
  const m = useChecklistMutations(trip.id)
  const [draft, setDraft] = useState('')
  const Icon = KIND_ICON[kind]
  const onError = () => toast.error(t('errors.generic'))

  // Open items first, then the ones already done; each in the order they were added.
  const sorted = [...items].sort((a, b) => Number(a.done) - Number(b.done) || a.created_at.localeCompare(b.created_at))

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const title = draft.trim()
    if (!title) return
    m.add.mutate({ kind, title, assignee_id: null }, { onSuccess: () => setDraft(''), onError })
  }

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-2xl">
        <Icon className="size-5 text-primary" />
        {t(`checklist.kinds.${kind}`)}
        <span className="font-sans text-sm font-semibold text-muted-foreground">
          {items.filter((i) => i.done).length}/{items.length}
        </span>
      </h2>

      {sorted.length === 0 && !canEdit && <p className="rounded-2xl bg-foreground/[0.04] px-4 py-3 text-sm text-muted-foreground">{t('checklist.empty')}</p>}

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {sorted.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 rounded-2xl bg-paper py-1.5 pr-1.5 pl-2 shadow-soft"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={item.done}
                aria-label={item.done ? t('checklist.markTodo') : t('checklist.markDone')}
                disabled={!canEdit}
                onClick={() => m.update.mutate({ id: item.id, patch: { done: !item.done } }, { onError })}
                className="flex size-10 shrink-0 items-center justify-center rounded-full transition active:scale-90 disabled:cursor-default"
              >
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full border-2 transition-colors',
                    item.done ? 'border-transparent bg-sage text-white' : 'border-foreground/25',
                  )}
                >
                  {item.done && <Check className="size-3.5" strokeWidth={3} />}
                </span>
              </button>
              <span className={cn('min-w-0 flex-1 text-[0.95rem] leading-snug break-words', item.done && 'text-muted-foreground line-through')}>
                {item.title}
              </span>
              <AssigneePicker item={item} canEdit={canEdit} onChange={(assignee_id) => m.update.mutate({ id: item.id, patch: { assignee_id } }, { onError })} />
              {canEdit && (
                <Button variant="ghost" size="icon-sm" aria-label={t('checklist.delete')} onClick={() => m.remove.mutate(item.id, { onError })}>
                  <X />
                </Button>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {canEdit && (
        <form onSubmit={add} className="flex gap-2">
          <Input
            value={draft}
            maxLength={160}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t(`checklist.placeholder.${kind}`)}
            aria-label={t('checklist.addTo', { list: t(`checklist.kinds.${kind}`) })}
            enterKeyHint="done"
          />
          <Button type="submit" variant="secondary" size="icon" className="size-12 shrink-0 rounded-2xl" disabled={!draft.trim() || m.add.isPending} aria-label={t('checklist.add')}>
            <Plus />
          </Button>
        </form>
      )}
    </section>
  )
}

export function ChecklistSection() {
  const { t } = useTranslation()
  const { trip, canEdit } = useTripContext()
  const { data: items, isLoading } = useChecklist(trip.id)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-[1.5rem]" />
        <Skeleton className="h-40 rounded-[1.5rem]" />
      </div>
    )
  }

  const total = items?.length ?? 0
  const done = items?.filter((i) => i.done).length ?? 0

  return (
    <div className="space-y-8">
      {total > 0 && (
        <div className="glass rounded-[1.5rem] px-5 py-4">
          <p className="text-sm font-semibold">{t('checklist.progress', { done, total })}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/[0.07]">
            <motion.div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--sun),var(--sage))]"
              initial={false}
              animate={{ width: `${(done / total) * 100}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      )}
      {!canEdit && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.05] px-3 py-1.5 text-xs text-muted-foreground">
          <Eye className="size-3.5" />
          {t('checklist.viewerHint')}
        </p>
      )}
      {CHECKLIST_KINDS.map((kind) => (
        <ChecklistGroup key={kind} kind={kind} items={items?.filter((i) => i.kind === kind) ?? []} />
      ))}
    </div>
  )
}
