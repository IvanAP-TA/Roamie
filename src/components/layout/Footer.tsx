import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GUIDE_BASE } from '@/content/guides/meta'
import type { LanguageCode } from '@/i18n'
import type { LegalDoc } from '@/components/legal/LegalContent'

// The sheet (and the legal texts' layout) is only downloaded when someone opens it.
const LegalSheet = lazy(() => import('@/components/legal/LegalSheet'))
import { cn } from '@/lib/utils'

const YOUTUBE_CHANNEL = 'https://www.youtube.com/channel/UC2yIT9xqetihpyU04NPpfvA'

export function Footer({ className }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const guidesPath = GUIDE_BASE[i18n.resolvedLanguage as LanguageCode] ?? GUIDE_BASE.en
  const [doc, setDoc] = useState<LegalDoc | null>(null)
  const [lastDoc, setLastDoc] = useState<LegalDoc | null>(null)

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
        <a
          href={YOUTUBE_CHANNEL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center px-1 underline-offset-4 transition hover:text-foreground hover:underline"
        >
          {t('footer.youtube')}
        </a>
        <span aria-hidden className="size-1 rounded-full bg-muted-foreground/40" />
        <span>© {new Date().getFullYear()} Roamie</span>
      </nav>

      {lastDoc && (
        <Suspense fallback={null}>
          <LegalSheet doc={lastDoc} open={doc !== null} onOpenChange={(o) => !o && setDoc(null)} />
        </Suspense>
      )}
    </footer>
  )
}
