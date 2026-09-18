import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CloudOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { safeNextPath } from '@/lib/utils'
import { AuroraBackground } from '@/components/brand/AuroraBackground'
import { Splash } from '@/components/layout/Splash'
import { Button } from '@/components/ui/button'

export default function AuthCallbackPage() {
  const { t } = useTranslation()
  const { session, loading, signOut, signInWithGoogle } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = safeNextPath(params.get('next'))
  // Supabase reports errors in the query or, depending on the flow, in the fragment.
  const fragment = new URLSearchParams(window.location.hash.slice(1))
  const errorCode = params.get('error_code') ?? fragment.get('error_code')
  const providerError = params.get('error_description') ?? fragment.get('error_description')
  // A guest linking a Google account that already has its own Roamie account.
  const alreadyLinked = errorCode === 'identity_already_exists'

  useEffect(() => {
    if (!loading && session && !alreadyLinked) navigate(next, { replace: true })
  }, [loading, session, alreadyLinked, next, navigate])

  if (loading) return <Splash />

  if (session && alreadyLinked) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <AuroraBackground />
        <div className="glass-strong w-full max-w-sm space-y-3 rounded-[2rem] p-8 text-center">
          <h1 className="text-2xl">{t('guest.alreadyLinkedTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('guest.alreadyLinkedBody')}</p>
          <Button
            size="lg"
            className="mt-3 w-full"
            onClick={async () => {
              // Sign the guest out first, so the Google sign-in starts clean.
              await signOut()
              await signInWithGoogle(next).catch(() => navigate('/', { replace: true }))
            }}
          >
            {t('guest.switchAccount')}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => navigate(next, { replace: true })}>
            {t('guest.stayGuest')}
          </Button>
        </div>
      </div>
    )
  }

  if (session) return <Splash />

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <AuroraBackground />
      <div className="glass-strong w-full max-w-sm rounded-[2rem] p-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <CloudOff className="size-6" />
        </div>
        <h1 className="text-2xl">{t('auth.callbackError')}</h1>
        {providerError && <p className="mt-2 text-sm text-muted-foreground">{providerError}</p>}
        <Button asChild size="lg" className="mt-6 w-full">
          <Link to={`/?next=${encodeURIComponent(next)}`}>{t('common.retry')}</Link>
        </Button>
      </div>
    </div>
  )
}
