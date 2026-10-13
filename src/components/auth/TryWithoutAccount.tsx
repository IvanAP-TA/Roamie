import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useGuestAccess } from '@/hooks/useGuestAccess'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'

/**
 * "Prova senza account" on the landing: just a name, then straight into a sample trip to play with. Google comes
 * later, when inviting friends. Shown only while guest sign-ins are enabled in Supabase.
 */
export function TryWithoutAccount({ lang }: { lang: string }) {
  const { t } = useTranslation(undefined, { lng: lang })
  const { signInAsGuest } = useAuth()
  const { data: available } = useGuestAccess()
  const [, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  if (!available) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      // The landing redirects to its ?next= as soon as there's a session, before any navigate() here could run:
      // that's where the sample trip has to be asked for, or the guest lands on an empty list.
      setParams({ next: '/trips?sample=1' }, { replace: true })
      await signInAsGuest(name)
    } catch {
      setParams({}, { replace: true })
      toast.error(t('guest.error'))
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="glass" size="lg" className="w-full" onClick={() => setOpen(true)}>
        <Sparkles />
        {t('sample.tryNoAccount')}
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title={t('sample.tryNoAccount')} description={t('sample.tryBody')}>
        <form onSubmit={(e) => void submit(e)} className="space-y-3 pb-2">
          <Input
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('guest.namePlaceholder')}
            aria-label={t('guest.namePlaceholder')}
            autoComplete="given-name"
            autoFocus
          />
          <Button type="submit" size="lg" className="w-full" disabled={!name.trim() || busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {t('sample.start')}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t('guest.hint')}</p>
        </form>
      </Sheet>
    </>
  )
}
