import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { GoogleButton } from '@/components/auth/GoogleButton'

/** After the wheel on the sample trip: the way to doing it for real, with friends (guests link Google first). */
export function SampleDone({ onDone, className }: { onDone?: () => void; className?: string }) {
  const { t } = useTranslation()
  const { isGuest } = useAuth()
  const navigate = useNavigate()
  return (
    <section className={className}>
      <h3 className="text-sm font-bold">{t('sample.doneTitle')}</h3>
      <div className="mt-3">
        {isGuest ? (
          <GoogleButton link next="/trips?new=1" label={t('sample.linkAndCreate')} className="h-11 bg-background" />
        ) : (
          <Button
            size="sm"
            onClick={() => {
              onDone?.()
              navigate('/trips?new=1')
            }}
          >
            <Plus />
            {t('sample.createOwn')}
          </Button>
        )}
      </div>
    </section>
  )
}
