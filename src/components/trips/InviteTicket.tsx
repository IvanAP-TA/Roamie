import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Lock, Send, Share2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { canNativeShare, copyText, formatInviteCode, inviteLink, shareOrCopy, whatsappShareUrl } from '@/lib/share'
import type { Trip } from '@/lib/types'
import { cn } from '@/lib/utils'

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88zm8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41z" />
    </svg>
  )
}

/**
 * A guest's own trip can't take members until they link Google (join_trip refuses): guests who never come back are
 * deleted with their trips, which mustn't take a group's work with them. Linking keeps the same user and the trip.
 */
function LinkToInvite({ className }: { className?: string }) {
  const { t } = useTranslation()
  const location = useLocation()
  return (
    <div className={cn('glass-strong space-y-3 rounded-[1.75rem] p-5', className)}>
      <p className="flex items-center gap-2 font-semibold">
        <Lock className="size-4 text-primary" />
        {t('guest.inviteTitle')}
      </p>
      <p className="text-sm text-muted-foreground">{t('guest.inviteBody')}</p>
      <GoogleButton link next={`${location.pathname}${location.search}`} label={t('guest.link')} className="bg-background" />
    </div>
  )
}

export function InviteTicket({ trip, className }: { trip: Trip; className?: string }) {
  const { isGuest, user } = useAuth()
  if (isGuest && trip.owner_id === user?.id) return <LinkToInvite className={className} />
  return <InviteCode trip={trip} className={className} />
}

/** The Roamie bot for Telegram groups (supabase/functions/telegram-bot), by its @username. */
const TELEGRAM_BOT = 'RoamieTripBot'

function InviteCode({ trip, className }: { trip: Trip; className?: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const url = inviteLink(trip.invite_code)
  const text = t('invite.shareText', { trip: trip.name })

  const markCopied = () => {
    setCopied(true)
    toast.success(t('invite.copied'))
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="ticket-notch relative overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,var(--coral),var(--primary)_55%,var(--dusk))] p-5 text-white [--notch-y:50%]">
        <div className="absolute -top-10 -right-10 size-36 rounded-full bg-white/15 blur-2xl" />
        <p className="text-[0.65rem] font-bold tracking-[0.24em] uppercase opacity-80">{t('invite.code')}</p>
        <p className="mt-1 font-mono text-[2rem] leading-none font-semibold tracking-[0.18em]">{formatInviteCode(trip.invite_code)}</p>
        <p className="mt-3 truncate text-xs opacity-80">{url.replace(/^https?:\/\//, '')}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {canNativeShare() && (
          <Button
            className="col-span-3"
            size="lg"
            onClick={async () => {
              const outcome = await shareOrCopy({ title: trip.name, text, url })
              if (outcome === 'copied') markCopied()
            }}
          >
            <Share2 />
            {t('invite.share')}
          </Button>
        )}
        <Button asChild variant="secondary" className="col-span-3 h-12 bg-[#25D366]/15 text-[#128C4B] hover:bg-[#25D366]/25 sm:col-span-2 dark:text-[#5fe08f]">
          <a href={whatsappShareUrl(text, url)} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon className="size-5" />
            WhatsApp
          </a>
        </Button>
        <Button
          variant="glass"
          className="col-span-3 h-12 sm:col-span-1"
          onClick={async () => {
            if (await copyText(url)) markCopied()
            else toast.error(t('errors.generic'))
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={copied ? 'ok' : 'copy'}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="inline-flex"
            >
              {copied ? <Check className="text-sage" /> : <Copy />}
            </motion.span>
          </AnimatePresence>
          {t('invite.copy')}
        </Button>
      </div>

      {/* The group's Telegram chat hears about new places, people joining and the wheel (supabase/functions/telegram-bot).
          Adding the bot from this link links the group to the trip by itself. */}
      {TELEGRAM_BOT && (
        <a
          href={`https://t.me/${TELEGRAM_BOT}?startgroup=${trip.invite_code}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl bg-[#229ED9]/12 px-4 py-3 text-sm transition hover:bg-[#229ED9]/20"
        >
          <Send className="size-5 shrink-0 text-[#229ED9]" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t('invite.telegram')}</span>
            <span className="block text-xs text-muted-foreground">{t('invite.telegramHint')}</span>
          </span>
        </a>
      )}
    </div>
  )
}
