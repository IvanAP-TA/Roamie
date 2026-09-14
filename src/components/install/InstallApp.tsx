import { Suspense, lazy, useState, useSyncExternalStore } from 'react'
import { Download, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getInstallState, promptInstall, serverInstallState, subscribeInstallState } from '@/lib/install'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const IosInstallSheet = lazy(() => import('./IosInstallSheet'))

const DISMISSED_KEY = 'roamie.installHintDismissed'

export function useInstallState() {
  const state = useSyncExternalStore(subscribeInstallState, getInstallState, () => serverInstallState)
  return { ...state, available: !state.installed && (state.canPrompt || state.isIos) }
}

/** Opens the browser's install dialog, or the "Add to Home Screen" steps on iPhone. Renders nothing when not installable. */
export function InstallAppButton({
  appearance = 'button',
  className,
}: {
  appearance?: 'button' | 'link' | 'row'
  className?: string
}) {
  const { t } = useTranslation()
  const { available, canPrompt } = useInstallState()
  const [iosOpen, setIosOpen] = useState(false)
  if (!available) return null

  const install = () => {
    if (canPrompt) void promptInstall()
    else setIosOpen(true)
  }

  return (
    <>
      {appearance === 'link' && (
        <button
          type="button"
          onClick={install}
          className={cn(
            'inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 transition hover:underline',
            className,
          )}
        >
          <Download className="size-4" />
          {t('install.button')}
        </button>
      )}
      {appearance === 'button' && (
        <Button onClick={install} className={className}>
          <Download />
          {t('install.button')}
        </Button>
      )}
      {appearance === 'row' && (
        <button
          type="button"
          onClick={install}
          className={cn('flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-foreground/[0.03]', className)}
        >
          <Download className="size-5 text-primary" />
          <span className="flex-1">
            <span className="block font-medium">{t('install.button')}</span>
            <span className="block text-xs text-muted-foreground">{t('install.rowHint')}</span>
          </span>
        </button>
      )}

      {iosOpen && (
        <Suspense fallback={null}>
          <IosInstallSheet open={iosOpen} onOpenChange={setIosOpen} />
        </Suspense>
      )}
    </>
  )
}

/** A one-time hint in the trips list; hidden for good once dismissed or installed. */
export function InstallAppCard({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { available } = useInstallState()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1'
    } catch {
      return false
    }
  })
  if (!available || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Private mode: the hint just comes back next time.
    }
  }

  return (
    <aside className={cn('glass relative flex flex-col items-start gap-4 rounded-[1.75rem] p-5 pr-12 sm:flex-row sm:items-center md:p-6 md:pr-14', className)}>
      <img src="/pwa-192x192.png" alt="" width={48} height={48} className="size-12 shrink-0 rounded-2xl shadow-soft" />
      <div className="min-w-0 flex-1">
        <h2 className="text-xl leading-snug">{t('install.cardTitle')}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{t('install.cardBody')}</p>
      </div>
      <InstallAppButton />
      <Button variant="ghost" size="icon-sm" aria-label={t('install.dismiss')} onClick={dismiss} className="absolute top-3 right-3">
        <X />
      </Button>
    </aside>
  )
}
