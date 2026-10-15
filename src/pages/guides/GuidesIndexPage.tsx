import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EXPLORE_COPY, MONTHS, monthName, monthPath } from '@/content/guides/explore'
import type { LanguageCode } from '@/i18n'
import { usePageMeta } from '@/hooks/useSeo'
import { guidesIndexMeta } from '@/lib/guideSeo'
import { guideCardPhoto } from '@/components/guides/GuideCardPhoto'
import { GuideCards } from '@/components/guides/GuideCards'
import { GuideCta, GuideShell, useUrlLanguage } from '@/components/guides/GuideLayout'
import { PageTransition } from '@/components/layout/PageTransition'

export default function GuidesIndexPage({ lang }: { lang: LanguageCode }) {
  const { t, i18n } = useTranslation(undefined, { lng: lang })
  useUrlLanguage(lang)
  usePageMeta(useMemo(() => guidesIndexMeta(lang, i18n.getFixedT(lang)), [lang, i18n]))

  return (
    <GuideShell>
      <PageTransition className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <header className="max-w-2xl pt-4 md:pt-10">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">{t('guides.eyebrow')}</p>
          <h1 className="mt-2 text-[2.6rem] leading-[1.02] md:text-6xl">{t('guides.indexTitle')}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t('guides.indexIntro')}</p>
        </header>
        <GuideCards lang={lang} heading="h2" media={guideCardPhoto} eager={2} className="mt-10" />
        <nav className="mt-14" aria-labelledby="by-month">
          <h2 id="by-month" className="text-3xl">
            {EXPLORE_COPY.monthEyebrow[lang]}
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {MONTHS.map((month) => (
              <li key={month}>
                <Link
                  to={monthPath(month, lang)}
                  className="glass flex min-h-12 items-center rounded-2xl px-4 text-sm font-medium capitalize transition hover:text-primary"
                >
                  {monthName(month, lang)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <GuideCta lang={lang} />
      </PageTransition>
    </GuideShell>
  )
}
