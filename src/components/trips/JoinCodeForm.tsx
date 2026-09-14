import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ALPHABET = /[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g

export function JoinCodeForm({ className, onDone }: { className?: string; onDone?: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  return (
    <form
      className={cn('space-y-3', className)}
      onSubmit={(e) => {
        e.preventDefault()
        if (code.length !== 8) return
        onDone?.()
        navigate(`/join/${code}`)
      }}
    >
      <label htmlFor="invite-code" className="sr-only">
        {t('invite.code')}
      </label>
      <input
        id="invite-code"
        value={code.length > 4 ? `${code.slice(0, 4)}·${code.slice(4)}` : code}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(ALPHABET, '').slice(0, 8))}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        placeholder="XXXX·XXXX"
        className="h-16 w-full rounded-3xl border-2 border-dashed border-foreground/15 bg-[var(--glass-strong)] text-center font-mono text-2xl font-semibold tracking-[0.25em] uppercase outline-none placeholder:text-muted-foreground/40 focus:border-primary"
      />
      <Button type="submit" size="lg" className="w-full" disabled={code.length !== 8}>
        {t('join.continue')}
        <ArrowRight />
      </Button>
    </form>
  )
}
