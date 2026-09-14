import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCheck, MapPin, MoreHorizontal, Pencil, Quote, RotateCcw, Sparkles, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useDeleteDestination, useDestinations, useUpdateDestination } from '@/hooks/useDestinations'
import { useTripContext } from '@/hooks/useTripContext'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { UserAvatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CoverImage } from '@/components/media/CoverImage'
import { AttributionText } from '@/components/media/Attribution'
import { BudgetIndicator, MoodTag } from './moods'
import { PointsControl, PointsLeftBadge } from './PointsControl'
import { CommentComposer, CommentsThread } from './CommentsThread'
import { DestinationFormSheet } from './DestinationFormSheet'
import type { Destination, DestinationStatus } from '@/lib/types'
import { timeAgo } from '@/lib/utils'

/** Opened from anywhere in a trip with `?d=<destinationId>`. */
export function DestinationDetailSheet() {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const { trip, members, canEdit, isOwner } = useTripContext()
  const { user } = useAuth()
  const { data: destinations } = useDestinations(trip.id)
  const update = useUpdateDestination(trip.id)
  const remove = useDeleteDestination(trip.id)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const scrollAnchor = useRef<HTMLDivElement>(null)

  const id = params.get('d')
  const found = destinations?.find((d) => d.id === id)
  // Keep rendering the last destination while the sheet animates out.
  const last = useRef<Destination | undefined>(undefined)
  if (found) last.current = found
  const d = found ?? last.current

  const close = () =>
    setParams(
      (p) => {
        p.delete('d')
        return p
      },
      { replace: true },
    )

  if (!d) return null

  const profileOf = (userId: string) => members.find((m) => m.user_id === userId)?.profile ?? null
  const voters = [...d.votes].sort((a, b) => b.points - a.points)
  const canDelete = isOwner || (canEdit && d.created_by === user?.id)

  const setStatus = (status: DestinationStatus) =>
    update.mutate(
      { id: d.id, patch: { status } },
      {
        onSuccess: () => toast.success(t(`status.changed.${status}`, { name: d.name })),
        onError: () => toast.error(t('errors.generic')),
      },
    )

  return (
    <>
      <Sheet
        open={Boolean(found) && !editing}
        onOpenChange={(open) => !open && close()}
        title={d.name}
        hideTitle
        className="md:max-w-xl"
        footer={
          <CommentComposer
            destinationId={d.id}
            tripId={trip.id}
            onSent={() => setTimeout(() => scrollAnchor.current?.scrollIntoView({ behavior: 'smooth' }), 150)}
          />
        }
      >
        <div className="-mx-2 space-y-6 md:-mx-3">
          <div>
            <CoverImage url={d.image_url} seed={d.name} pin showAttribution={false} className="h-64 rounded-[1.75rem] shadow-soft md:mt-2">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.25),transparent_30%,transparent_55%,rgb(20_10_5/0.65))]" />
              <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                {d.status !== 'proposed' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--glass-strong)] px-3 py-1 text-xs font-bold tracking-wide uppercase backdrop-blur-md">
                    {d.status === 'selected' ? <Sparkles className="size-3.5 text-primary" /> : <CheckCheck className="size-3.5 text-sage" />}
                    {t(`status.${d.status}`)}
                  </span>
                ) : (
                  <span />
                )}
                <div className="flex gap-1.5">
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="glass" size="icon-sm" aria-label={t('common.more')}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onSelect={() => setEditing(true)}>
                          <Pencil />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        {d.status !== 'visited' && (
                          <DropdownMenuItem onSelect={() => setStatus('visited')}>
                            <CheckCheck />
                            {t('status.markVisited')}
                          </DropdownMenuItem>
                        )}
                        {d.status !== 'proposed' && (
                          <DropdownMenuItem onSelect={() => setStatus('proposed')}>
                            <RotateCcw />
                            {t('status.backToProposed')}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive onSelect={() => setConfirmDelete(true)}>
                              <Trash2 />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Button variant="glass" size="icon-sm" onClick={close} aria-label={t('common.close')}>
                    <X />
                  </Button>
                </div>
              </div>
              <div className="absolute inset-x-5 bottom-4 text-white">
                <h2 className="text-4xl leading-none drop-shadow-md">{d.name}</h2>
                {(d.country || d.lat != null) && (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-sm text-white/85">
                    <MapPin className="size-3.5" />
                    {d.country ?? `${d.lat?.toFixed(2)}, ${d.lng?.toFixed(2)}`}
                  </p>
                )}
              </div>
            </CoverImage>
            <AttributionText raw={d.image_attribution} className="mt-2 px-2" />
          </div>

          <div className="space-y-3 px-2">
            <div className="flex flex-wrap items-center gap-3">
              <PointsControl destination={d} size="lg" />
              {d.status === 'proposed' && <PointsLeftBadge tripId={trip.id} />}
            </div>
            {voters.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label={t('points.score', { count: voters.reduce((s, v) => s + v.points, 0) })}>
                {voters.map((v) => {
                  const profile = profileOf(v.user_id)
                  return (
                    <li key={v.id} className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] py-0.5 pr-2.5 pl-0.5 text-xs">
                      <UserAvatar profile={profile} className="size-6 text-[0.55rem]" />
                      <span className="max-w-24 truncate">{profile?.display_name?.split(' ')[0] ?? t('group.formerMember')}</span>
                      <span className="font-semibold text-primary">+{v.points}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {(d.mood.length > 0 || d.budget_level) && (
            <div className="flex flex-wrap items-center gap-2 px-2">
              {d.mood.map((m) => (
                <MoodTag key={m} mood={m} />
              ))}
              {d.budget_level && (
                <span className="inline-flex h-7 items-center rounded-full bg-foreground/[0.05] px-2.5 text-xs">
                  <BudgetIndicator level={d.budget_level} showLabel className="[&_.text-sm]:text-xs" />
                </span>
              )}
            </div>
          )}

          {d.expectations && (
            <section className="relative mx-2 rounded-[1.5rem] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--sun)_18%,transparent),color-mix(in_oklab,var(--coral)_10%,transparent))] px-5 pt-5 pb-4">
              <Quote className="absolute -top-3 left-4 size-7 rotate-180 fill-primary/20 text-primary" />
              <h3 className="font-sans text-xs font-bold tracking-wide text-primary uppercase">{t('destination.expectations')}</h3>
              <p className="mt-1.5 leading-relaxed whitespace-pre-line">{d.expectations}</p>
            </section>
          )}

          <p className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
            {d.creator && <UserAvatar profile={d.creator} className="size-6 text-[0.55rem]" />}
            {t('destination.proposedBy', {
              name: d.creator?.display_name ?? t('group.formerMember'),
              when: timeAgo(d.created_at, i18n.resolvedLanguage ?? 'en'),
            })}
          </p>

          <section className="space-y-3 px-2">
            <h3 className="text-xl">
              {t('comments.title')} <span className="font-sans text-sm font-semibold text-muted-foreground">{d.comments[0]?.count ?? 0}</span>
            </h3>
            <CommentsThread destinationId={d.id} tripId={trip.id} isOwner={isOwner} />
            <div ref={scrollAnchor} />
          </section>
        </div>
      </Sheet>

      <DestinationFormSheet open={editing} onOpenChange={setEditing} tripId={trip.id} destination={d} />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('destination.deleteTitle', { name: d.name })}
        description={t('destination.deleteBody')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        icon={<Trash2 />}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(d.id)
            close()
            toast.success(t('destination.deleted'))
          } catch {
            toast.error(t('errors.generic'))
          }
        }}
      />
    </>
  )
}
