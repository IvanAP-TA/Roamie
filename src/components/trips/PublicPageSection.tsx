import { useState } from 'react'
import { Check, Copy, ExternalLink, Globe2, Loader2, Share2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useSetTripPublic } from '@/hooks/usePublicTrip'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { copyText, publicTripLink, shareOrCopy } from '@/lib/share'
import type { Trip } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/misc'

/** Owner: publish or hide the read-only trip page. Other members: its link, once it's public. */
export function PublicPageSection({ trip, isOwner }: { trip: Trip; isOwner: boolean }) {
  const { t } = useTranslation()
  const { isGuest } = useAuth()
  const location = useLocation()
  const setPublic = useSetTripPublic(trip.id)
  const [copied, setCopied] = useState(false)

  if (!isOwner && !trip.public_slug) return null
  const link = trip.public_slug ? publicTripLink(trip.public_slug) : null

  const toggle = (value: boolean) => {
    if (setPublic.isPending) return
    setPublic.mutate(value, {
      onSuccess: () => toast.success(t(value ? 'publicPage.published' : 'publicPage.unpublished')),
      onError: () => toast.error(t('errors.generic')),
    })
  }

  const copy = async () => {
    if (!link) return
    if (await copyText(link)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } else {
      toast.error(t('errors.generic'))
    }
  }

  const share = async () => {
    if (!link) return
    const outcome = await shareOrCopy({ title: trip.name, text: t('publicPage.shareText', { trip: trip.name }), url: link })
    if (outcome === 'copied') toast.success(t('publicPage.copied'))
    else if (outcome === 'failed') toast.error(t('errors.generic'))
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-2xl">{t('publicPage.sectionTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('publicPage.sectionBody')}</p>
      </div>
      <div className="glass divide-y divide-border rounded-[1.75rem]">
        {/* Publishing, like inviting, waits for a Google account (set_trip_public refuses guests). */}
        {isOwner && isGuest && !link && (
          <div className="space-y-3 px-5 py-4">
            <p className="text-sm text-muted-foreground">{t('publicPage.guest')}</p>
            <GoogleButton link next={`${location.pathname}${location.search}`} label={t('guest.link')} className="bg-background" />
          </div>
        )}
        {isOwner && !(isGuest && !link) && (
          <div className="flex items-center gap-3 px-5 py-4">
            <Globe2 className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t('publicPage.toggle')}</p>
              <p className="text-xs text-muted-foreground">{t('publicPage.indexHint')}</p>
            </div>
            {setPublic.isPending && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
            <Switch checked={Boolean(trip.public_slug)} onCheckedChange={toggle} label={t('publicPage.toggle')} />
          </div>
        )}
        {link && (
          <div className="space-y-3 px-5 py-4">
            <p className="truncate font-mono text-xs text-muted-foreground" title={link}>
              {link.replace(/^https?:\/\//, '')}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void copy()}>
                {copied ? <Check /> : <Copy />}
                {copied ? t('publicPage.copied') : t('publicPage.copy')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void share()}>
                <Share2 />
                {t('publicPage.share')}
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a href={link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  {t('publicPage.open')}
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
