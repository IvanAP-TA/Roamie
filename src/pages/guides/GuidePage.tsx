import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GUIDE_CONTENT, type GuidePlace } from '@/content/guides/content'
import { EXPLORE_COPY, findExplore, guidePairs, pairPath } from '@/content/guides/explore'
import { guideHeroImage, guidePhotoSrcSet } from '@/content/guides/images'
import { findGuide, GUIDE_BASE, type GuideMeta } from '@/content/guides/meta'
import type { LanguageCode } from '@/i18n'
import { usePageMeta } from '@/hooks/useSeo'
import { guideMeta } from '@/lib/guideSeo'
import { serializeAttribution } from '@/lib/wikimedia'
import { CoverImage } from '@/components/media/CoverImage'
import { AddToTripSheet } from '@/components/guides/AddToTripSheet'
import { UseGuideTrip } from '@/components/guides/UseGuideTrip'
import { guideCardPhoto } from '@/components/guides/GuideCardPhoto'
import { GuidePlaceCard } from '@/components/guides/GuidePlaceCard'
import { BridgeArticle, MonthArticle, PairArticle } from '@/pages/guides/ExplorePages'
import { GuideCards } from '@/components/guides/GuideCards'
import { GuideCta, GuideShell, useUrlLanguage } from '@/components/guides/GuideLayout'
import { PageTransition } from '@/components/layout/PageTransition'
import { useTransitionClick } from '@/lib/viewTransition'
import NotFoundPage from '@/pages/NotFoundPage'

export default function GuidePage({ lang }: { lang: LanguageCode }) {
  const { slug } = useParams()
  const guide = findGuide(lang, slug)
  if (guide) return <GuideArticle key={guide.id} guide={guide} lang={lang} />
  // The month and comparison pages share the guides' URLs.
  const target = findExplore(lang, slug)
  if (target?.kind === 'month') return <MonthArticle key={target.month} month={target.month} lang={lang} />
  if (target?.kind === 'bridge') return <BridgeArticle key={target.bridge.id} bridge={target.bridge} />
  if (target?.kind === 'pair') return <PairArticle key={`${target.pair.a.key}+${target.pair.b.key}`} pair={target.pair} lang={lang} />
  return <NotFoundPage />
}

/** Also rendered directly by the prerenderer, which has no route params. */
export function GuideArticle({ guide, lang }: { guide: GuideMeta; lang: LanguageCode }) {
  const { t, i18n } = useTranslation(undefined, { lng: lang })
  useUrlLanguage(lang)
  usePageMeta(useMemo(() => guideMeta(guide, lang, i18n.getFixedT(lang)), [guide, lang, i18n]))
  const content = GUIDE_CONTENT[guide.id]
  const cover = guideHeroImage(guide.id)
  const [adding, setAdding] = useState<GuidePlace | null>(null)
  const pairs = guidePairs(guide.id)
  // The cover shrinks back into the guide's card on the index.
  const backToGuides = useTransitionClick(GUIDE_BASE[lang], { name: 'guide-cover', from: '[data-vt="guide-hero"]', to: `[data-vt="guide-${guide.id}"]` })

  return (
    <GuideShell>
      <PageTransition className="mx-auto w-full max-w-4xl px-5 md:px-8">
        <Link
          to={GUIDE_BASE[lang]}
          onClick={backToGuides}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t('guides.all')}
        </Link>

        <article>
          <header>
            <CoverImage
              url={cover?.url}
              attribution={cover ? serializeAttribution(cover.attribution) : null}
              seed={guide.id}
              sizes="(min-width: 896px) 832px, 100vw"
              avif={cover ? guidePhotoSrcSet(cover) : undefined}
              dimensions={cover ?? undefined}
              priority
              vt="guide-hero"
              imgClassName="cover-depth"
              className="mt-2 h-44 rounded-[2rem] shadow-soft md:h-60"
            />
            <p className="mt-8 text-sm font-semibold tracking-wide text-primary uppercase">{t('guides.eyebrow')}</p>
            <h1 className="mt-2 text-[2.3rem] leading-[1.04] md:text-6xl">{guide.title[lang]}</h1>
            <p className="mt-5 text-lg leading-relaxed text-foreground/80">{content.intro[lang]}</p>
            {content.places.length > 0 && <UseGuideTrip guide={guide} places={content.places} lang={lang} />}
          </header>

          {content.steps.length > 0 && (
            <ol className="mt-10 space-y-4">
              {content.steps.map((step, index) => (
                <li key={index} className="glass flex gap-4 rounded-[1.75rem] p-5 md:gap-6 md:p-7">
                  <span aria-hidden className="font-display text-4xl leading-none text-primary italic">
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="text-2xl leading-snug">{step.title[lang]}</h2>
                    <p className="mt-2 leading-relaxed text-muted-foreground">{step.body[lang]}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {content.places.length > 0 && (
            <>
              <p className="glass mt-8 flex items-start gap-3 rounded-[1.5rem] p-4 text-sm leading-relaxed">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                {t('guides.howToUse')}
              </p>
              <ol className="mt-8 space-y-5">
                {content.places.map((place, index) => (
                  <GuidePlaceCard key={place.key} place={place} index={index} lang={lang} onAdd={setAdding} />
                ))}
              </ol>
            </>
          )}
          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">{t('guides.disclaimer')}</p>
        </article>

        {pairs.length > 0 && (
          <nav className="mt-12" aria-labelledby="comparisons">
            <h2 id="comparisons" className="text-2xl">
              {EXPLORE_COPY.moreComparisons[lang]}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {pairs.map((pair) => (
                <li key={`${pair.a.key}+${pair.b.key}`}>
                  <Link to={pairPath(pair, lang)} className="glass inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium transition hover:text-primary">
                    {pair.a.name[lang]} · {pair.b.name[lang]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <section className="mt-16 space-y-5" aria-labelledby="more-guides">
          <h2 id="more-guides" className="text-3xl">
            {t('guides.more')}
          </h2>
          <GuideCards lang={lang} exclude={guide.id} limit={4} media={guideCardPhoto} />
        </section>

        <GuideCta lang={lang} />
      </PageTransition>

      <AddToTripSheet place={adding} lang={lang} onClose={() => setAdding(null)} />
    </GuideShell>
  )
}
