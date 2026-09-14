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
  const { session, loading } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = safeNextPath(params.get('next'))
  const providerError = params.get('error_description')

  useEffect(() => {
    if (!loading && session) navigate(next, { replace: true })
  }, [loading, session, next, navigate])

  if (loading || session) return <Splash />

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
