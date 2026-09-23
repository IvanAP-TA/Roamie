import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { isSampleTrip } from '@/hooks/useAddGuidePlace'
import { useTripContext } from '@/hooks/useTripContext'
import { useDeleteTrip } from '@/hooks/useTrips'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

/** On the sample trip made on this device: what it is, what to try, and the way to a real one (or out of it). */
export function SampleTripBanner() {
  const { t } = useTranslation()
  const { trip, isOwner } = useTripContext()
  const navigate = useNavigate()
  const deleteTrip = useDeleteTrip()
  const [confirming, setConfirming] = useState(false)

  if (!isOwner || !isSampleTrip(trip.id)) return null

  return (
    <section className="glass-strong rounded-[2rem] p-5">
      <p className="flex items-center gap-2 font-semibold">
        <Sparkles className="size-4 text-primary" />
        {t('sample.bannerTitle')}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{t('sample.bannerBody')}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => navigate('/trips?new=1')}>
          <Plus />
          {t('sample.createOwn')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
          <Trash2 />
          {t('sample.delete')}
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('sample.deleteTitle')}
        description={t('sample.deleteBody')}
        confirmLabel={t('sample.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        icon={<Trash2 />}
        onConfirm={async () => {
          try {
            await deleteTrip.mutateAsync(trip.id)
            navigate('/trips', { replace: true })
          } catch {
            toast.error(t('errors.generic'))
          }
        }}
      />
    </section>
  )
}
