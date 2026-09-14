import { useSyncExternalStore } from 'react'
import { onlineManager } from '@tanstack/react-query'
import { CloudOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** A small notice while there's no connection: the app shows what's saved on the device. */
export function OfflineBanner() {
  const { t } = useTranslation()
  const online = useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true,
  )
  if (online) return null

  return (
    <div role="status" className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3">
      <p className="glass-strong mt-2 inline-flex max-w-md items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-soft">
        <CloudOff className="size-4 shrink-0 text-primary" />
        {t('offline.banner')}
      </p>
    </div>
  )
}
