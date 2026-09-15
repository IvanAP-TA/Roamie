import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AtSign, Bell, BellOff, CalendarDays, FerrisWheel, Loader2, MapPinPlus, MessageCircle, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { currentSubscription, disablePush, enablePush, pushSupport } from '@/lib/push'
import { supabase } from '@/lib/supabase'
import { InstallAppButton } from '@/components/install/InstallApp'
import { Switch } from '@/components/ui/misc'

const CATEGORIES = [
  { id: 'destinations', icon: MapPinPlus },
  { id: 'roulette', icon: FerrisWheel },
  { id: 'dates', icon: CalendarDays },
  { id: 'members', icon: UserPlus },
  { id: 'mentions', icon: AtSign },
  { id: 'comments', icon: MessageCircle },
] as const

type Category = (typeof CATEGORIES)[number]['id']
type Preferences = Record<Category, boolean>

const EVERYTHING_ON: Preferences = { destinations: true, roulette: true, dates: true, members: true, mentions: true, comments: true }

/** Profile section: push on this device, and which events to be told about (shared by all the user's devices). */
export function NotificationSettings() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const qc = useQueryClient()
  const support = pushSupport()
  // null while checking whether this device is already subscribed
  const [enabled, setEnabled] = useState<boolean | null>(support === 'supported' ? null : false)
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState(() => support === 'supported' && Notification.permission === 'denied')

  useEffect(() => {
    if (support !== 'supported') return
    let cancelled = false
    currentSubscription().then(
      (subscription) => !cancelled && setEnabled(Boolean(subscription) && Notification.permission === 'granted'),
      () => !cancelled && setEnabled(false),
    )
    return () => {
      cancelled = true
    }
  }, [support])

  const key = ['notification-preferences', user?.id]
  const { data: preferences = EVERYTHING_ON } = useQuery({
    queryKey: key,
    enabled: Boolean(user) && enabled === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('destinations, roulette, dates, members, mentions, comments')
        .maybeSingle()
      if (error) throw error
      return data ?? EVERYTHING_ON
    },
  })

  const setPreference = useMutation({
    mutationFn: async (next: Preferences) => {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({ ...next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (error) throw error
    },
    onMutate: (next) => {
      const previous = qc.getQueryData<Preferences>(key)
      qc.setQueryData<Preferences>(key, next)
      return { previous }
    },
    onError: (_error, _next, context) => {
      qc.setQueryData(key, context?.previous)
      toast.error(t('errors.generic'))
    },
  })

  const toggleDevice = async (on: boolean) => {
    setBusy(true)
    try {
      if (!on) {
        await disablePush()
        setEnabled(false)
        return
      }
      if ((await enablePush(i18n.resolvedLanguage ?? 'it')) === 'denied') {
        setBlocked(Notification.permission === 'denied')
        toast(t('notifications.denied'))
        return
      }
      setBlocked(false)
      setEnabled(true)
      toast.success(t('notifications.enabled'))
    } catch {
      toast.error(t('notifications.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-2xl">{t('notifications.title')}</h2>
      <div className="glass divide-y divide-border rounded-[1.75rem]">
        {support === 'supported' && (
          <>
            <div className="flex items-center gap-3 px-5 py-3.5">
              {enabled ? <Bell className="size-5 shrink-0 text-primary" /> : <BellOff className="size-5 shrink-0 text-muted-foreground" />}
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{t('notifications.device')}</span>
                <span className="block text-xs text-muted-foreground">{t(blocked ? 'notifications.blocked' : 'notifications.deviceHint')}</span>
              </span>
              {busy || enabled === null ? (
                <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <Switch checked={enabled} onCheckedChange={(on) => void toggleDevice(on)} label={t('notifications.device')} />
              )}
            </div>
            {enabled &&
              CATEGORIES.map(({ id, icon: Icon }) => (
                <div key={id} className="flex items-center gap-3 px-5 py-3.5">
                  <Icon className="size-5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{t(`notifications.categories.${id}.title`)}</span>
                    <span className="block text-xs text-muted-foreground">{t(`notifications.categories.${id}.hint`)}</span>
                  </span>
                  <Switch
                    checked={preferences[id]}
                    onCheckedChange={(on) => setPreference.mutate({ ...preferences, [id]: on })}
                    label={t(`notifications.categories.${id}.title`)}
                  />
                </div>
              ))}
          </>
        )}
        {support === 'needs-install' && (
          <>
            <p className="px-5 py-4 text-sm text-muted-foreground">{t('notifications.needsInstall')}</p>
            <InstallAppButton appearance="row" />
          </>
        )}
        {support === 'unsupported' && <p className="px-5 py-4 text-sm text-muted-foreground">{t('notifications.unsupported')}</p>}
      </div>
    </section>
  )
}
