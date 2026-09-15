import { getInstallState } from '@/lib/install'
import { supabase } from '@/lib/supabase'

/**
 * Web Push on this device. The service worker (public/push-sw.js) shows the notifications; the push-send Edge
 * Function sends them. A subscription belongs to the account signed in on the device and is removed on sign-out.
 */

export type PushSupport = 'supported' | 'needs-install' | 'unsupported'

export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported'
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) return 'supported'
  // iPhone and iPad get push only in the app added to the Home Screen (iOS 16.4+).
  const install = getInstallState()
  return install.isIos && !install.installed ? 'needs-install' : 'unsupported'
}

const PUBLIC_KEY_CACHE = 'roamie.pushKey'

function base64UrlToBytes(text: string): Uint8Array<ArrayBuffer> {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

function bytesToBase64Url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function serverPublicKey(): Promise<string> {
  try {
    const cached = localStorage.getItem(PUBLIC_KEY_CACHE)
    if (cached) return cached
  } catch {
    // Storage blocked: ask the server every time.
  }
  const { data, error } = await supabase.functions.invoke<{ publicKey: string }>('push-send', { body: { action: 'public-key' } })
  if (error || !data?.publicKey) throw error ?? new Error('push_key_unavailable')
  try {
    localStorage.setItem(PUBLIC_KEY_CACHE, data.publicKey)
  } catch {
    // Not cached: fine.
  }
  return data.publicKey
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration()
  return registration ? registration.pushManager.getSubscription() : null
}

async function save(subscription: PushSubscription, lang: string) {
  const { keys } = subscription.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: subscription.endpoint,
    p_p256dh: keys!.p256dh,
    p_auth: keys!.auth,
    p_lang: ['it', 'en', 'es'].includes(lang) ? lang : 'it',
  })
  if (error) throw error
}

/** Asks for permission (call from a tap) and subscribes this device. */
export async function enablePush(lang: string): Promise<'enabled' | 'denied'> {
  if ((await Notification.requestPermission()) !== 'granted') return 'denied'
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) throw new Error('no_service_worker')
  const key = await serverPublicKey()

  let subscription = await registration.pushManager.getSubscription()
  // Made with another key: our messages would be rejected.
  const subscribedKey = subscription?.options.applicationServerKey
  if (subscription && subscribedKey && bytesToBase64Url(subscribedKey) !== key) {
    await subscription.unsubscribe()
    subscription = null
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) })
  await save(subscription, lang)
  return 'enabled'
}

/** Stops notifications on this device. The browser subscription goes even if the server can't be reached. */
export async function disablePush() {
  if (pushSupport() !== 'supported') return
  const subscription = await currentSubscription()
  if (!subscription) return
  try {
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  } finally {
    await subscription.unsubscribe()
  }
}

/** Keeps a device that has notifications on attached to the signed-in account and its current language. */
export async function syncPush(lang: string) {
  if (pushSupport() !== 'supported' || Notification.permission !== 'granted') return
  const subscription = await currentSubscription()
  if (subscription) await save(subscription, lang)
}
