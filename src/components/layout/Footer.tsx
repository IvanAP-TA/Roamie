import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GUIDE_BASE } from '@/content/guides/meta'
import type { LanguageCode } from '@/i18n'
import { Sheet } from '@/components/ui/sheet'
import { LegalContent, type LegalDoc } from '@/components/legal/LegalContent'
import { cn } from '@/lib/utils'

export function Footer({ className }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const guidesPath = GUIDE_BASE[i18n.resolvedLanguage as LanguageCode] ?? GUIDE_BASE.en
  const [doc, setDoc] = useState<LegalDoc | null>(null)
  const [lastDoc, setLastDoc] = useState<LegalDoc>('privacy')

  const open = (next: LegalDoc) => {
    setLastDoc(next)
    setDoc(next)
  }

  return (
    <footer className={cn('flex flex-col items-center gap-2 py-8 text-xs text-muted-foreground', className)}>
      <p className="inline-flex items-center gap-1.5">
        <ShieldCheck className="size-3.5 text-sage" />
        {t('footer.noTrackers')}
      </p>
      <nav className="flex flex-wrap items-center justify-center gap-x-3">
        <Link to={guidesPath} className="inline-flex min-h-10 items-center px-1 underline-offset-4 transition hover:text-foreground hover:underline">
          {t('footer.guides')}
        </Link>
        <span aria-hidden className="size-1 rounded-full bg-muted-foreground/40" />
        <a
          href="/privacy"
          onClick={(e) => {
            e.preventDefault()
            open('privacy')
          }}
          className="inline-flex min-h-10 items-center px-1 underline-offset-4 transition hover:text-foreground hover:underline"
        >
          {t('footer.privacy')}
        </a>
        <span aria-hidden className="size-1 rounded-full bg-muted-foreground/40" />
        <a
          href="/terms"
          onClick={(e) => {
            e.preventDefault()
            open('terms')
          }}
          className="inline-flex min-h-10 items-center px-1 underline-offset-4 transition hover:text-foreground hover:underline"
        >
          {t('footer.terms')}
        </a>
        <span aria-hidden className="size-1 rounded-full bg-muted-foreground/40" />
        <span>© {new Date().getFullYear()} Roamie</span>
      </nav>

      <Sheet
        open={doc !== null}
        onOpenChange={(o) => !o && setDoc(null)}
        title={t(`legal.${lastDoc}.title`)}
      >
        <LegalContent doc={lastDoc} />
      </Sheet>
    </footer>
  )
}
