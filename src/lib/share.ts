import { appUrl } from './utils'

export const inviteLink = (code: string) => `${appUrl()}/join/${code}`

export const publicTripLink = (slug: string) => `${appUrl()}/p/${slug}`

export const formatInviteCode = (code: string) => `${code.slice(0, 4)}·${code.slice(4)}`

export const whatsappShareUrl = (text: string, url: string) => `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`

export const canNativeShare = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed'

/** Native share sheet on phones (WhatsApp shows up there), clipboard fallback on desktop. */
export async function shareOrCopy({ title, text, url }: { title: string; text: string; url: string }): Promise<ShareOutcome> {
  if (canNativeShare()) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return 'cancelled'
    }
  }
  return (await copyText(url)) ? 'copied' : 'failed'
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}
