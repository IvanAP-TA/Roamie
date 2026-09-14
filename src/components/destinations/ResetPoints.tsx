import { useState } from 'react'
import { RotateCcw, UserRound, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useResetPoints } from '@/hooks/useDestinations'
import { useTripContext } from '@/hooks/useTripContext'
import type { Destination } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

type Scope = 'mine' | 'everyone'

/** "Reset points": everyone can take back their own points; the owner can also restart the vote for the whole group. */
export function ResetPointsButton({ destinations }: { destinations: Destination[] }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { trip, isOwner } = useTripContext()
  const reset = useResetPoints(trip.id)
  const [confirm, setConfirm] = useState<Scope | null>(null)

  const proposed = destinations.filter((d) => d.status === 'proposed')
  const hasMine = proposed.some((d) => d.votes.some((v) => v.user_id === user?.id))
  const hasAny = proposed.some((d) => d.votes.length > 0)
  if (!hasMine && !(isOwner && hasAny)) return null

  // Icon-only on narrow phones, so the points row keeps compare & sort beside it.
  const label = (
    <>
      <RotateCcw className="size-3.5" />
      <span className="sr-only min-[420px]:not-sr-only">{t('reset.button')}</span>
    </>
  )
  const buttonClass = 'h-8 rounded-full px-2.5 text-xs min-[420px]:px-3'

  const run = async (scope: Scope) => {
    try {
      await reset.mutateAsync(scope === 'everyone')
      toast.success(t(scope === 'everyone' ? 'reset.everyoneDone' : 'reset.mineDone'))
    } catch {
      toast.error(t('errors.generic'))
    }
  }

  return (
    <>
      {isOwner && hasAny ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className={buttonClass} title={t('reset.button')}>
              {label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuItem disabled={!hasMine} onSelect={() => setConfirm('mine')}>
              <UserRound />
              {t('reset.mine')}
            </DropdownMenuItem>
            <DropdownMenuItem destructive onSelect={() => setConfirm('everyone')}>
              <Users />
              {t('reset.everyone')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button variant="ghost" size="sm" className={buttonClass} title={t('reset.button')} onClick={() => setConfirm('mine')}>
          {label}
        </Button>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t(confirm === 'everyone' ? 'reset.everyoneTitle' : 'reset.mineTitle')}
        description={t(confirm === 'everyone' ? 'reset.everyoneBody' : 'reset.mineBody')}
        confirmLabel={t('reset.confirm')}
        cancelLabel={t('common.cancel')}
        destructive={confirm === 'everyone'}
        icon={<RotateCcw />}
        onConfirm={() => (confirm ? run(confirm) : undefined)}
      />
    </>
  )
}
