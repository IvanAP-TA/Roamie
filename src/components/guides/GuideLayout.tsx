import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { LanguageCode } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { AuroraBackground } from '@/components/brand/AuroraBackground'
import { Logo } from '@/components/brand/Logo'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { Footer } from '@/components/layout/Footer'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { Button } from '@/components/ui/button'

/** Guide URLs have a fixed language, like the landings: the UI follows it. */
export function useUrlLanguage(lang: LanguageCode) {
  const { i18n } = useTranslation()
  useEffect(() => {
    if (i18n.resolvedLanguage !== lang) void i18n.changeLanguage(lang)
  }, [i18n, lang])
}

export function GuideShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <AuroraBackground />
      <header className="pt-safe mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        <Logo />
        <LanguageSwitcher />
      </header>
      <main className="flex-1 pb-4">{children}</main>
      <Footer />
    </div>
  )
}

export function GuideCta({ lang }: { lang: LanguageCode }) {
  const { t } = useTranslation(undefined, { lng: lang })
  const { session } = useAuth()

  return (
    <section className="glass-strong mx-auto mt-16 max-w-2xl rounded-[2rem] p-7 text-center md:p-10">
      <h2 className="text-3xl leading-tight md:text-4xl">{t('guides.ctaTitle')}</h2>
      <p className="mx-auto mt-2 max-w-md text-muted-foreground">{t('guides.ctaBody')}</p>
      <div className="mx-auto mt-6 max-w-sm">
        {session ? (
          <Button asChild size="lg" className="w-full">
            <Link to="/trips">
              {t('guides.ctaMember')}
              <ArrowRight />
            </Link>
          </Button>
        ) : (
          <GoogleButton next="/trips" />
        )}
      </div>
    </section>
  )
}
