import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { GuidePlace } from '@/content/guides/content'
import { EXPLORE_COPY, MONTHS, monthName, monthPath, pairPath, placesForMonth, relatedPairs, verdict, type ExplorePlace, type Pair } from '@/content/guides/explore'
import { bestMonthsLabel } from '@/content/guides/format'
import { guidePlaceImage } from '@/content/guides/images'
import { GUIDE_BASE, GUIDES, guidePath } from '@/content/guides/meta'
import type { LanguageCode } from '@/i18n'
import { usePageMeta } from '@/hooks/useSeo'
import { flagEmoji } from '@/lib/flags'
import { monthMeta, pairMeta } from '@/lib/guideSeo'
import { cn } from '@/lib/utils'
import { serializeAttribution } from '@/lib/wikimedia'
import { BudgetIndicator, MoodTag } from '@/components/destinations/moods'
import { CoverImage } from '@/components/media/CoverImage'
import { AddToTripSheet } from '@/components/guides/AddToTripSheet'
import { GuidePlaceCard } from '@/components/guides/GuidePlaceCard'
import { GuideCta, GuideShell, useUrlLanguage } from '@/components/guides/GuideLayout'
import { PageTransition } from '@/components/layout/PageTransition'

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

function BackToGuides({ lang }: { lang: LanguageCode }) {
  const { t } = useTranslation(undefined, { lng: lang })
  return (
    <Link to={GUIDE_BASE[lang]} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
      <ArrowLeft className="size-4" />
      {t('guides.all')}
    </Link>
  )
}

/** "From the guide …": where a place's full write-up lives. */
function FromGuide({ place, lang }: { place: ExplorePlace; lang: LanguageCode }) {
  const guide = GUIDES.find((g) => g.id === place.guides[0])
  if (!guide) return null
  return (
    <p className="text-sm text-muted-foreground">
      <BookOpen className="mr-1 inline size-4 align-[-2px]" />
      {EXPLORE_COPY.inGuide[lang]}{' '}
      <Link to={guidePath(guide, lang)} className="font-medium text-foreground underline-offset-4 hover:underline">
        {guide.title[lang]}
      </Link>
    </p>
  )
}

function Chips({ items }: { items: { to: string; label: string; current?: boolean }[] }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item.to}>
          <Link
            to={item.to}
            aria-current={item.current ? 'page' : undefined}
            className={cn('glass inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium transition hover:text-primary', item.current && 'text-primary')}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** "Where to go in November with friends": the guides' places at their best that month. */
export function MonthArticle({ month, lang }: { month: number; lang: LanguageCode }) {
  const { t, i18n } = useTranslation(undefined, { lng: lang })
  useUrlLanguage(lang)
  usePageMeta(useMemo(() => monthMeta(month, lang, i18n.getFixedT(lang)), [month, lang, i18n]))
  const places = placesForMonth(month)
  const name = monthName(month, lang)
  const cover = guidePlaceImage(places[0]?.key ?? '')
  const [adding, setAdding] = useState<GuidePlace | null>(null)

  return (
    <GuideShell>
      <PageTransition className="mx-auto w-full max-w-4xl px-5 md:px-8">
        <BackToGuides lang={lang} />
        <article>
          <header>
            <CoverImage
              url={cover?.url}
              attribution={cover ? serializeAttribution(cover.attribution) : null}
              seed={`month-${month}`}
              sizes="(min-width: 896px) 832px, 100vw"
              priority
              className="mt-2 h-44 rounded-[2rem] shadow-soft md:h-60"
            />
            <p className="mt-8 text-sm font-semibold tracking-wide text-primary uppercase">{EXPLORE_COPY.monthEyebrow[lang]}</p>
            <h1 className="mt-2 text-[2.3rem] leading-[1.04] md:text-6xl">{EXPLORE_COPY.monthTitle[lang](name)}</h1>
            <p className="mt-5 text-lg leading-relaxed text-foreground/80">{EXPLORE_COPY.monthLead[lang](name, places.length)}</p>
            <p className="mt-3 leading-relaxed text-muted-foreground">{EXPLORE_COPY.season(month, lang)}</p>
          </header>

          <p className="glass mt-8 flex items-start gap-3 rounded-[1.5rem] p-4 text-sm leading-relaxed">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            {t('guides.howToUse')}
          </p>
          <ol className="mt-8 space-y-5">
            {places.map((place, index) => (
              <GuidePlaceCard key={place.key} place={place} index={index} lang={lang} onAdd={setAdding} footer={<FromGuide place={place} lang={lang} />} />
            ))}
          </ol>
          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">{t('guides.disclaimer')}</p>
        </article>

        <nav className="mt-12" aria-labelledby="other-months">
          <h2 id="other-months" className="text-2xl">
            {EXPLORE_COPY.otherMonths[lang]}
          </h2>
          <Chips items={MONTHS.map((m) => ({ to: monthPath(m, lang), label: capitalize(monthName(m, lang)), current: m === month }))} />
        </nav>

        <GuideCta lang={lang} />
      </PageTransition>
      <AddToTripSheet place={adding} lang={lang} onClose={() => setAdding(null)} />
    </GuideShell>
  )
}

/** "Lisbon or Porto?": two places of the same guide side by side, with a verdict built from their facts. */
export function PairArticle({ pair, lang }: { pair: Pair; lang: LanguageCode }) {
  const { t, i18n } = useTranslation(undefined, { lng: lang })
  useUrlLanguage(lang)
  usePageMeta(useMemo(() => pairMeta(pair, lang, i18n.getFixedT(lang)), [pair, lang, i18n]))
  const [adding, setAdding] = useState<GuidePlace | null>(null)
  const places = [pair.a, pair.b]
  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([lang], { type: 'region' })
    } catch {
      return null
    }
  }, [lang])
  const label = (months: number[]) => bestMonthsLabel(months, lang)
  const country = (p: ExplorePlace) => `${flagEmoji(p.countryCode)} ${regionNames?.of(p.countryCode) ?? p.countryCode}`
  const rows: { label: string; cell: (p: ExplorePlace) => React.ReactNode }[] = [
    { label: EXPLORE_COPY.rows.country[lang], cell: country },
    { label: EXPLORE_COPY.rows.budget[lang], cell: (p) => <BudgetIndicator level={p.budget} showLabel /> },
    { label: EXPLORE_COPY.rows.when[lang], cell: (p) => label(p.months) },
    {
      label: EXPLORE_COPY.rows.vibe[lang],
      cell: (p) => (
        <span className="flex flex-wrap gap-1">
          {p.moods.map((m) => (
            <MoodTag key={m} mood={m} />
          ))}
        </span>
      ),
    },
  ]

  return (
    <GuideShell>
      <PageTransition className="mx-auto w-full max-w-4xl px-5 md:px-8">
        <BackToGuides lang={lang} />
        <article>
          <header>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {places.map((p) => {
                const photo = guidePlaceImage(p.key)
                return (
                  <CoverImage
                    key={p.key}
                    url={photo?.url}
                    attribution={photo ? serializeAttribution(photo.attribution) : null}
                    seed={p.key}
                    sizes="(min-width: 896px) 416px, 50vw"
                    priority
                    className="h-40 rounded-[1.75rem] shadow-soft md:h-56"
                    attributionClassName="right-2 bottom-2"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(0deg,rgb(20_10_5/0.55),transparent_55%)]" />
                    <span className="absolute bottom-3 left-4 font-display text-2xl text-white drop-shadow-md md:text-4xl">{p.name[lang]}</span>
                  </CoverImage>
                )
              })}
            </div>
            <p className="mt-8 text-sm font-semibold tracking-wide text-primary uppercase">{EXPLORE_COPY.pairEyebrow[lang]}</p>
            <h1 className="mt-2 text-[2.1rem] leading-[1.06] md:text-5xl">{EXPLORE_COPY.pairTitle[lang](pair.a.name[lang], pair.b.name[lang])}</h1>
            <p className="mt-5 text-lg leading-relaxed text-foreground/80">{EXPLORE_COPY.pairDescription[lang](pair.a.name[lang], pair.b.name[lang])}</p>
          </header>

          <div className="mt-8 overflow-x-auto rounded-[1.75rem] bg-paper shadow-soft">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="p-4" />
                  {places.map((p) => (
                    <th key={p.key} scope="col" className="p-4 font-display text-xl font-normal">
                      {p.name[lang]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-border/40 last:border-0">
                    <th scope="row" className="p-4 font-medium text-muted-foreground">
                      {row.label}
                    </th>
                    {places.map((p) => (
                      <td key={p.key} className="p-4 align-top">
                        {row.cell(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="glass mt-8 rounded-[1.75rem] p-6" aria-labelledby="verdict">
            <h2 id="verdict" className="text-2xl">
              {EXPLORE_COPY.verdictTitle[lang]}
            </h2>
            <ul className="mt-3 space-y-2 leading-relaxed text-foreground/85">
              <li>{verdict(pair.a, pair.b, lang, label)}</li>
              <li>{verdict(pair.b, pair.a, lang, label)}</li>
            </ul>
            <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              {EXPLORE_COPY.stillUndecided[lang]}
            </p>
          </section>

          <ol className="mt-8 space-y-5">
            {places.map((place, index) => (
              <GuidePlaceCard key={place.key} place={place} index={index} lang={lang} onAdd={setAdding} footer={<FromGuide place={place} lang={lang} />} />
            ))}
          </ol>
          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">{t('guides.disclaimer')}</p>
        </article>

        <nav className="mt-12" aria-labelledby="more-comparisons">
          <h2 id="more-comparisons" className="text-2xl">
            {EXPLORE_COPY.moreComparisons[lang]}
          </h2>
          <Chips items={relatedPairs(pair).map((p) => ({ to: pairPath(p, lang), label: `${p.a.name[lang]} · ${p.b.name[lang]}` }))} />
        </nav>

        <GuideCta lang={lang} />
      </PageTransition>
      <AddToTripSheet place={adding} lang={lang} onClose={() => setAdding(null)} />
    </GuideShell>
  )
}
