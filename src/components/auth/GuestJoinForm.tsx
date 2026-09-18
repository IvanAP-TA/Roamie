import { useState } from 'react'
import { Loader2, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useGuestAccess } from '@/hooks/useGuestAccess'
import { isSupabaseConfigured } from '@/lib/supabaseEnv'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** On an invite: join with just a name, no account. Google can be linked later without losing anything. */
export function GuestJoinForm({ onJoined }: { onJoined: () => void }) {
  const { t } = useTranslation()
  const { signInAsGuest } = useAuth()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const { data: available } = useGuestAccess()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || busy) return
    if (!isSupabaseConfigured) {
      toast.error(t('auth.notConfigured'))
      return
    }
    setBusy(true)
    try {
      await signInAsGuest(name)
      onJoined()
    } catch {
      toast.error(t('guest.error'))
      setBusy(false)
    }
  }

  if (!available) return null

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-2.5">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t('guest.or')}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Input
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('guest.namePlaceholder')}
        aria-label={t('guest.namePlaceholder')}
        autoComplete="given-name"
      />
      <Button type="submit" variant="glass" size="lg" className="w-full" disabled={!name.trim() || busy}>
        {busy ? <Loader2 className="animate-spin" /> : <UserRound />}
        {t('guest.join')}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t('guest.hint')}</p>
    </form>
  )
}
