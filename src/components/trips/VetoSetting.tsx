import { Ban, Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useSetVetoesPerYear } from '@/hooks/useVetoes'
import type { Trip } from '@/lib/types'
import { Button } from '@/components/ui/button'

/** How many vetoes each member has per year in this trip: the owner changes it, the others see it. */
export function VetoSetting({ trip, isOwner }: { trip: Trip; isOwner: boolean }) {
  const { t } = useTranslation()
  const set = useSetVetoesPerYear(trip.id)
  const change = (delta: number) => set.mutate(trip.vetoes_per_year + delta, { onError: () => toast.error(t('errors.generic')) })

  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <Ban className="size-5 text-primary" />
      <span className="flex-1 font-medium">{t('veto.setting')}</span>
      {isOwner ? (
        <span className="inline-flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={t('points.remove')} disabled={trip.vetoes_per_year <= 0 || set.isPending} onClick={() => change(-1)}>
            <Minus />
          </Button>
          <span className="w-6 text-center font-semibold tabular-nums">{trip.vetoes_per_year}</span>
          <Button variant="ghost" size="icon-sm" aria-label={t('points.add')} disabled={trip.vetoes_per_year >= 5 || set.isPending} onClick={() => change(1)}>
            <Plus />
          </Button>
        </span>
      ) : (
        <span className="font-semibold tabular-nums">{trip.vetoes_per_year}</span>
      )}
    </div>
  )
}
