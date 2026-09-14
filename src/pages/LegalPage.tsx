import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSeo } from '@/hooks/useSeo'
import { AuroraBackground } from '@/components/brand/AuroraBackground'
import { Logo } from '@/components/brand/Logo'
import { LegalContent, type LegalDoc } from '@/components/legal/LegalContent'
import { Footer } from '@/components/layout/Footer'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button } from '@/components/ui/button'

/** Standalone, linkable versions of the legal texts (also required by Google's OAuth consent screen). */
export default function LegalPage({ doc }: { doc: LegalDoc }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  useSeo(doc)

  return (
    <div className="relative min-h-dvh">
      <AuroraBackground />
      <header className="pt-safe mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Button
            variant="glass"
            size="icon-sm"
            aria-label={t('common.back')}
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          >
            <ArrowLeft />
          </Button>
          <Logo />
        </div>
        <LanguageSwitcher />
      </header>
      <PageTransition className="mx-auto max-w-3xl px-5">
        <h1 className="mt-4 mb-6 text-4xl md:text-5xl">{t(`legal.${doc}.title`)}</h1>
        <div className="glass rounded-[2rem] p-6 md:p-10">
          <LegalContent doc={doc} />
        </div>
      </PageTransition>
      <Footer />
    </div>
  )
}
