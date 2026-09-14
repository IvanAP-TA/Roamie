import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Crown, DoorOpen, Eye, MoreHorizontal, Pencil, RefreshCw, Trash2, UserMinus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useTripContext } from '@/hooks/useTripContext'
import { useDeleteTrip, useRegenerateInvite, useRemoveMember, useUpdateMemberRole } from '@/hooks/useTrips'
import { PageTransition, staggerContainer, staggerItem } from '@/components/layout/PageTransition'
import { InviteTicket } from '@/components/trips/InviteTicket'
import { PublicPageSection } from '@/components/trips/PublicPageSection'
import { TripFormSheet } from '@/components/trips/TripFormSheet'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Role, TripMember } from '@/lib/types'
import { cn } from '@/lib/utils'

const ROLE_BADGE: Record<Role, string> = {
  owner: 'bg-[var(--sun)]/25 text-[#8a4b12] dark:text-[var(--sun)]',
  editor: 'bg-accent text-accent-foreground',
  viewer: 'bg-muted text-muted-foreground',
}

type Pending =
  | { kind: 'regenerate' }
  | { kind: 'delete' }
  | { kind: 'leave' }
  | { kind: 'remove'; member: TripMember }
  | null

export default function GroupTab() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { trip, members, me, isOwner, canEdit } = useTripContext()
  const regenerate = useRegenerateInvite(trip.id)
  const updateRole = useUpdateMemberRole(trip.id)
  const removeMember = useRemoveMember(trip.id)
  const deleteTrip = useDeleteTrip()
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState<Pending>(null)

  const confirm = async () => {
    if (!pending) return
    try {
      switch (pending.kind) {
        case 'regenerate':
          await regenerate.mutateAsync()
          toast.success(t('group.regenerated'))
          break
        case 'remove':
          await removeMember.mutateAsync(pending.member.id)
          toast.success(t('group.removed', { name: pending.member.profile?.display_name ?? '' }))
          break
        case 'leave':
          await removeMember.mutateAsync(me!.id)
          navigate('/trips', { replace: true })
          toast.success(t('group.left'))
          break
        case 'delete':
          await deleteTrip.mutateAsync(trip.id)
          navigate('/trips', { replace: true })
          toast.success(t('group.deleted'))
          break
      }
    } catch {
      toast.error(t('errors.generic'))
    }
  }

  const dialog = (() => {
    switch (pending?.kind) {
      case 'regenerate':
        return { title: t('group.regenerateTitle'), body: t('group.regenerateBody'), cta: t('group.regenerate'), destructive: false, icon: <RefreshCw /> }
      case 'remove':
        return {
          title: t('group.removeTitle', { name: pending.member.profile?.display_name ?? '' }),
          body: t('group.removeBody'),
          cta: t('group.remove'),
          destructive: true,
          icon: <UserMinus />,
        }
      case 'leave':
        return { title: t('group.leaveTitle'), body: t('group.leaveBody'), cta: t('group.leave'), destructive: true, icon: <DoorOpen /> }
      case 'delete':
        return { title: t('group.deleteTitle'), body: t('group.deleteBody'), cta: t('group.delete'), destructive: true, icon: <Trash2 /> }
      default:
        return null
    }
  })()

  return (
    <PageTransition className="mx-auto max-w-3xl space-y-10 px-5 pt-2 md:px-6">
      <header>
        <p className="truncate text-sm font-medium text-muted-foreground">{trip.name}</p>
        <h1 className="text-[2.6rem] leading-none md:text-5xl">{t('group.title')}</h1>
      </header>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl">{t('invite.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('invite.subtitle')}</p>
          </div>
          {isOwner && (
            <Button variant="ghost" size="sm" onClick={() => setPending({ kind: 'regenerate' })}>
              <RefreshCw className={cn(regenerate.isPending && 'animate-spin')} />
              <span className="hidden sm:inline">{t('group.regenerate')}</span>
            </Button>
          )}
        </div>
        <InviteTicket trip={trip} />
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">
          {t('group.members')} <span className="font-sans text-base font-semibold text-muted-foreground">{members.length}</span>
        </h2>
        <motion.ul variants={staggerContainer} initial="hidden" animate="show" className="glass divide-y divide-border rounded-[1.75rem]">
          {members.map((member) => {
            const isMe = member.id === me?.id
            return (
              <motion.li key={member.id} variants={staggerItem} layout className="flex items-center gap-3 px-4 py-3">
                <UserAvatar profile={member.profile} className="size-11" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {member.profile?.display_name ?? t('group.unknown')}
                    {isMe && <span className="ml-1.5 text-sm font-normal text-muted-foreground">({t('group.you')})</span>}
                  </p>
                  <span className={cn('mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.68rem] font-bold tracking-wide uppercase', ROLE_BADGE[member.role])}>
                    {member.role === 'owner' && <Crown className="size-3" />}
                    {member.role === 'viewer' && <Eye className="size-3" />}
                    {t(`roles.${member.role}`)}
                  </span>
                </div>
                {isOwner && member.role !== 'owner' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={t('group.manage')}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60">
                      <DropdownMenuRadioGroup
                        value={member.role}
                        onValueChange={(role) =>
                          updateRole.mutate(
                            { memberId: member.id, role: role as 'editor' | 'viewer' },
                            { onError: () => toast.error(t('errors.generic')) },
                          )
                        }
                      >
                        {(['editor', 'viewer'] as const).map((role) => (
                          <DropdownMenuRadioItem key={role} value={role} className="flex-col items-start gap-0">
                            <span className="font-semibold">{t(`roles.${role}`)}</span>
                            <span className="text-xs text-muted-foreground">{t(`roles.${role}Hint`)}</span>
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setPending({ kind: 'remove', member })}>
                        <UserMinus />
                        {t('group.remove')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </motion.li>
            )
          })}
        </motion.ul>
        <p className="px-2 text-xs text-muted-foreground">{t('group.rolesLegend')}</p>
      </section>

      <PublicPageSection trip={trip} isOwner={isOwner} />

      <section className="space-y-3">
        <h2 className="text-2xl">{t('group.settings')}</h2>
        <div className="glass divide-y divide-border rounded-[1.75rem]">
          {canEdit && (
            <button type="button" onClick={() => setEditing(true)} className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-foreground/[0.03]">
              <Pencil className="size-5 text-primary" />
              <span className="flex-1 font-medium">{t('group.editDetails')}</span>
            </button>
          )}
          {isOwner ? (
            <button type="button" onClick={() => setPending({ kind: 'delete' })} className="flex w-full items-center gap-3 px-5 py-4 text-left text-destructive transition hover:bg-destructive/5">
              <Trash2 className="size-5" />
              <span className="flex-1 font-medium">{t('group.delete')}</span>
            </button>
          ) : (
            <button type="button" onClick={() => setPending({ kind: 'leave' })} className="flex w-full items-center gap-3 px-5 py-4 text-left text-destructive transition hover:bg-destructive/5">
              <DoorOpen className="size-5" />
              <span className="flex-1 font-medium">{t('group.leave')}</span>
            </button>
          )}
        </div>
      </section>

      <TripFormSheet open={editing} onOpenChange={setEditing} trip={trip} />

      {dialog && (
        <ConfirmDialog
          open={pending !== null}
          onOpenChange={(open) => !open && setPending(null)}
          title={dialog.title}
          description={dialog.body}
          confirmLabel={dialog.cta}
          cancelLabel={t('common.cancel')}
          destructive={dialog.destructive}
          icon={dialog.icon}
          onConfirm={confirm}
        />
      )}
    </PageTransition>
  )
}
