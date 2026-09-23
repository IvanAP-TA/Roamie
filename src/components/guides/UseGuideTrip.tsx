import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { GuidePlace } from '@/content/guides/content'
import type { GuideMeta } from '@/content/guides/meta'
import type { LanguageCode } from '@/i18n'
import { useCreateTripFromGuide } from '@/hooks/useAddGuidePlace'
import { useAuth } from '@/hooks/useAuth'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'

/**
 * "Crea il viaggio con queste mete": the guide as a ready-made trip, with every place already proposed, so the
 * group can start voting right away. Signed out (or as a guest), it signs in first and finishes on the way back.
 */
export function UseGuideTrip({ guide, places, lang }: { guide: GuideMeta; places: GuidePlace[]; lang: LanguageCode }) {
  const { t } = useTranslation(undefined, { lng: lang })
  const { session } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const create = useCreateTripFromGuide(lang)
  const [signingIn, setSigningIn] = useState(false)
  const resumed = useRef(false)
  const back = `${location.pathname}?use=1`

  const run = useCallback(() => {
    if (create.isPending) return
    create.mutate(
      { guide, places },
      {
        onSuccess: (tripId) => {
          toast.success(t('guides.tripCreated', { count: places.length }))
          // Straight to the invite: the places are already in, the group is what's missing.
          navigate(`/trips/${tripId}/group`)
        },
        onError: () => toast.error(t('errors.generic')),
      },
    )
  }, [create, guide, places, navigate, t])

  // Back from signing in (?use=1): finish what was started, once.
  useEffect(() => {
    if (params.get('use') !== '1' || !session || resumed.current) return
    resumed.current = true
    setParams(
      (p) => {
        p.delete('use')
        return p
      },
      { replace: true },
    )
    run()
  }, [params, session, setParams, run])

  return (
    <>
      <div className="glass-strong mt-8 flex flex-col gap-4 rounded-[1.75rem] p-5 sm:flex-row sm:items-center md:p-6">
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{t('guides.useTripHint')}</p>
        <Button size="lg" className="shrink-0" disabled={create.isPending} onClick={() => (session ? run() : setSigningIn(true))}>
          {create.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {t('guides.useTrip', { count: places.length })}
        </Button>
      </div>

      <Sheet open={signingIn && !session} onOpenChange={setSigningIn} title={t('guides.useTrip', { count: places.length })}>
        <div className="space-y-4 pb-2">
          <p className="text-sm text-muted-foreground">{t('guides.useTripSignIn')}</p>
          <GoogleButton next={back} />
        </div>
      </Sheet>
    </>
  )
}
