import { useState } from 'react'
import { Ban } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useSetVeto, useVetoes } from '@/hooks/useVetoes'
import { useTripContext } from '@/hooks/useTripContext'
import { rpcErrorCode } from '@/lib/supabase'
import type { Destination } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

/**
 * A veto takes the place off the wheel, for everyone and without saying whose it was, so nobody ends up somewhere they
 * really dislike. Only while the place is still in the running, and only if you still have one of the year's.
 */
export function VetoControl({ destination: d }: { destination: Destination }) {
  const { t } = useTranslation()
  const { trip } = useTripContext()
  const { mine, left } = useVetoes(trip)
  const setVeto = useSetVeto(trip.id)
  const [confirming, setConfirming] = useState(false)
  const iVetoed = mine.has(d.id)

  if (d.status !== 'proposed') return null

  const run = (veto: boolean) =>
    setVeto.mutate(
      { destinationId: d.id, veto },
      {
        onError: (err) => {
          const code = rpcErrorCode(err as Error)
          toast.error(code === 'veto_has_points' ? t('veto.hasPoints') : code === 'veto_too_few' ? t('veto.tooFew') : code === 'no_vetoes_left' ? t('veto.noneLeft') : t('errors.generic'))
        },
      },
    )

  if (iVetoed) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Ban className="size-4 shrink-0 text-destructive" />
        <span className="flex-1">{t('veto.offWheel')}</span>
        <Button variant="ghost" size="sm" onClick={() => run(false)} disabled={setVeto.isPending}>
          {t('veto.undo')}
        </Button>
      </div>
    )
  }
  if (d.vetoes > 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Ban className="size-4 shrink-0" />
        {t('veto.offWheel')}
      </p>
    )
  }
  if (left <= 0) return null

  return (
    <>
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => setConfirming(true)}>
        <Ban />
        {t('veto.button')}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('veto.confirmTitle', { name: d.name })}
        description={t('veto.confirmBody', { count: left })}
        confirmLabel={t('veto.button')}
        cancelLabel={t('common.cancel')}
        destructive
        icon={<Ban />}
        onConfirm={() => run(true)}
      />
    </>
  )
}
