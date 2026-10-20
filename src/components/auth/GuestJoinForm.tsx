import { useState } from 'react'
import { Loader2, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useGuestAccess } from '@/hooks/useGuestAccess'
import { isSupabaseConfigured } from '@/lib/supabaseEnv'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * On an invite: join with just a name, no account. Google can be linked later without losing anything.
 * `primary`: the first way in (the invite page, where friends arrive from the group chat), with Google after it.
 */
export function GuestJoinForm({ onJoined, primary = false }: { onJoined: () => void; primary?: boolean }) {
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
      {!primary && <Divider label={t('guest.or')} />}
      <Input
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('guest.namePlaceholder')}
        aria-label={t('guest.namePlaceholder')}
        autoComplete="given-name"
      />
      <Button type="submit" variant={primary ? 'default' : 'glass'} size="lg" className="w-full" disabled={!name.trim() || busy}>
        {busy ? <Loader2 className="animate-spin" /> : <UserRound />}
        {t('guest.join')}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t('guest.hint')}</p>
      {primary && <Divider label={t('guest.or')} />}
    </form>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
