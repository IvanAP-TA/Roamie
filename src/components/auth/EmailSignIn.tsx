import { useState } from 'react'
import { Loader2, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Sign in with an email and a 6-digit code, no password and no Google (useAuth: sendEmailCode, verifyEmailCode).
 * A quiet link under the Google button; the sheet asks for name and email, then for the code from the email.
 * `onSignedIn` runs once the session is there (the invite page joins the trip then).
 */
export function EmailSignIn({ onSignedIn, className }: { onSignedIn?: () => void; className?: string }) {
  const { t } = useTranslation()
  const { sendEmailCode, verifyEmailCode } = useAuth()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!EMAIL.test(email.trim()) || busy) return
    setBusy(true)
    try {
      await sendEmailCode(email, name)
      setSent(true)
      setCode('')
    } catch (error) {
      toast.error(/rate|seconds/i.test((error as Error).message) ? t('emailSignIn.wait') : t('emailSignIn.sendError'))
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.replace(/\D/g, '').length < 6 || busy) return
    setBusy(true)
    try {
      await verifyEmailCode(email, code)
      setOpen(false)
      onSignedIn?.()
    } catch {
      toast.error(t('emailSignIn.badCode'))
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('inline-flex min-h-11 items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline', className)}
      >
        <Mail className="size-4" />
        {t('emailSignIn.link')}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={t('emailSignIn.title')} description={sent ? t('emailSignIn.sent', { email: email.trim() }) : t('emailSignIn.intro')}>
        {!sent ? (
          <form onSubmit={(e) => void send(e)} className="space-y-3 pb-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={t('guest.namePlaceholder')} aria-label={t('guest.namePlaceholder')} autoComplete="given-name" />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" placeholder={t('emailSignIn.email')} aria-label={t('emailSignIn.email')} autoComplete="email" required />
            <Button type="submit" size="lg" className="w-full" disabled={!EMAIL.test(email.trim()) || busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Mail />}
              {t('emailSignIn.send')}
            </Button>
            <p className="text-center text-xs text-muted-foreground">{t('emailSignIn.noPassword')}</p>
          </form>
        ) : (
          <form onSubmit={(e) => void verify(e)} className="space-y-3 pb-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              aria-label={t('emailSignIn.code')}
              className="text-center font-mono text-2xl tracking-[0.4em]"
              autoFocus
            />
            <Button type="submit" size="lg" className="w-full" disabled={code.length < 6 || busy}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              {t('emailSignIn.verify')}
            </Button>
            <div className="flex justify-between text-sm">
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setSent(false)}>
                {t('emailSignIn.change')}
              </button>
              <button type="button" className="font-semibold text-primary" disabled={busy} onClick={() => void send()}>
                {t('emailSignIn.resend')}
              </button>
            </div>
          </form>
        )}
      </Sheet>
    </>
  )
}
