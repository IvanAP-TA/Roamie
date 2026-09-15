import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Plus, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GUIDE_CONTENT, type GuidePlace } from '@/content/guides/content'
import { bestMonthsLabel } from '@/content/guides/format'
import { guideCoverImage, guidePlaceImage } from '@/content/guides/images'
import { findGuide, GUIDE_BASE, type GuideMeta } from '@/content/guides/meta'
import type { LanguageCode } from '@/i18n'
import { usePageMeta } from '@/hooks/useSeo'
import { flagEmoji } from '@/lib/flags'
import { guideMeta } from '@/lib/guideSeo'
import { serializeAttribution } from '@/lib/wikimedia'
import { BudgetIndicator, MoodTag } from '@/components/destinations/moods'
import { CoverImage } from '@/components/media/CoverImage'
import { AddToTripSheet } from '@/components/guides/AddToTripSheet'
import { guideCardPhoto } from '@/components/guides/GuideCardPhoto'
import { GuideCards } from '@/components/guides/GuideCards'
import { GuideCta, GuideShell, useUrlLanguage } from '@/components/guides/GuideLayout'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button } from '@/components/ui/button'
import NotFoundPage from '@/pages/NotFoundPage'

export default function GuidePage({ lang }: { lang: LanguageCode }) {
  const { slug } = useParams()
  const guide = findGuide(lang, slug)
  if (!guide) return <NotFoundPage />
  return <GuideArticle key={guide.id} guide={guide} lang={lang} />
}

/** Also rendered directly by the prerenderer, which has no route params. */
export function GuideArticle({ guide, lang }: { guide: GuideMeta; lang: LanguageCode }) {
  const { t, i18n } = useTranslation(undefined, { lng: lang })
  useUrlLanguage(lang)
  usePageMeta(useMemo(() => guideMeta(guide, lang, i18n.getFixedT(lang)), [guide, lang, i18n]))
  const content = GUIDE_CONTENT[guide.id]
  const cover = guideCoverImage(guide.id)
  const [adding, setAdding] = useState<GuidePlace | null>(null)
  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([lang], { type: 'region' })
    } catch {
      return null
    }
  }, [lang])

  return (
    <GuideShell>
      <PageTransition className="mx-auto w-full max-w-4xl px-5 md:px-8">
        <Link
          to={GUIDE_BASE[lang]}
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
              className="mt-2 h-44 rounded-[2rem] shadow-soft md:h-60"
            />
            <p className="mt-8 text-sm font-semibold tracking-wide text-primary uppercase">{t('guides.eyebrow')}</p>
            <h1 className="mt-2 text-[2.3rem] leading-[1.04] md:text-6xl">{guide.title[lang]}</h1>
            <p className="mt-5 text-lg leading-relaxed text-foreground/80">{content.intro[lang]}</p>
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
                {content.places.map((place, index) => {
                  const photo = guidePlaceImage(place.key)
                  return (
                  <li
                    key={place.key}
                    id={place.key}
                    className="scroll-mt-6 overflow-hidden rounded-[2rem] bg-paper shadow-soft md:grid md:grid-cols-[13rem_1fr]"
                  >
                    <CoverImage
                      url={photo?.url}
                      attribution={photo ? serializeAttribution(photo.attribution) : null}
                      seed={place.key}
                      className="flex h-44 items-center justify-center md:h-full md:min-h-56"
                      attributionClassName="right-2 bottom-2"
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgb(20_10_5/0.45),transparent_55%)]" />
                      <span aria-hidden className="absolute top-3 left-4 font-display text-5xl text-white/95 italic drop-shadow-md">
                        {index + 1}
                      </span>
                    </CoverImage>
                    <div className="space-y-3 p-5 md:p-6">
                      <div>
                        <h2 className="text-3xl leading-tight">{place.name[lang]}</h2>
                        <p className="text-sm text-muted-foreground">
                          <span aria-hidden>{flagEmoji(place.countryCode)} </span>
                          {regionNames?.of(place.countryCode) ?? place.countryCode}
                        </p>
                      </div>
                      <p className="leading-relaxed text-foreground/80">{place.text[lang]}</p>
                      <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                        <div className="flex items-center gap-1.5">
                          <dt className="inline-flex items-center gap-1 text-muted-foreground">
                            <CalendarDays className="size-4" />
                            {t('guides.bestTime')}
                          </dt>
                          <dd className="font-semibold">{bestMonthsLabel(place.months, lang)}</dd>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <dt className="sr-only">{t('guides.budget')}</dt>
                          <dd>
                            <BudgetIndicator level={place.budget} showLabel />
                          </dd>
                        </div>
                      </dl>
                      <div className="flex flex-wrap gap-1.5">
                        {place.moods.map((mood) => (
                          <MoodTag key={mood} mood={mood} />
                        ))}
                      </div>
                      <Button onClick={() => setAdding(place)} className="mt-1">
                        <Plus />
                        {t('guides.addToTrip')}
                      </Button>
                    </div>
                  </li>
                  )
                })}
              </ol>
            </>
          )}
          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">{t('guides.disclaimer')}</p>
        </article>

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
