import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, Search, Sparkles, Stamp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { usePassport } from '@/hooks/usePassport'
import { useSeo } from '@/hooks/useSeo'
import { countryName, loadCountries, type CountryTable } from '@/lib/countries'
import { cn } from '@/lib/utils'
import { CountrySheet, guidePlacePoints } from '@/components/explore/CountrySheet'
import { Globe } from '@/components/explore/Globe'
import { TripFinder } from '@/components/explore/TripFinder'
import { GuideShell } from '@/components/guides/GuideLayout'
import { PageTransition } from '@/components/layout/PageTransition'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { collator } from '@/lib/intl'

/** "Esplora": a dark globe to turn and tap, with a card for each country. The picked country lives in ?c=. */
export default function ExplorePage() {
  const { t, i18n } = useTranslation()
  useSeo('app')
  const lang = i18n.resolvedLanguage ?? 'it'
  const [params, setParams] = useSearchParams()
  const selected = params.get('c')?.toUpperCase() ?? null
  const [countries, setCountries] = useState<CountryTable | null>(null)
  const [query, setQuery] = useState('')
  const { session } = useAuth()
  const passport = usePassport()
  const [showVisited, setShowVisited] = useState(true)
  // Back from signing in to use it (?ai=1): open it right away.
  const [finding, setFinding] = useState(() => params.get('ai') === '1')

  useEffect(() => {
    if (params.get('ai') !== '1') return
    setParams(
      (p) => {
        p.delete('ai')
        return p
      },
      { replace: true },
    )
  }, [params, setParams])

  useEffect(() => {
    void loadCountries().then(setCountries)
  }, [])

  const visited = useMemo(
    () => new Set((passport.data?.stamps ?? []).map((stamp) => stamp.countryCode).filter((code): code is string => Boolean(code))),
    [passport.data],
  )

  const names = useMemo(
    () =>
      countries
        ? Object.keys(countries)
            .map((code) => ({ code, name: countryName(code, lang) }))
            .sort((a, b) => collator(lang).compare(a.name, b.name))
        : [],
    [countries, lang],
  )

  const select = (code: string | null) =>
    setParams(
      (p) => {
        if (code) p.set('c', code)
        else p.delete('c')
        return p
      },
      { replace: Boolean(code && selected) },
    )

  const search = (value: string) => {
    setQuery(value)
    const plain = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
    const match = names.find((n) => plain(n.name) === plain(value))
    if (match) {
      select(match.code)
      setQuery('')
    }
  }

  return (
    <GuideShell>
      <PageTransition className="mx-auto w-full max-w-5xl px-5 md:px-8">
        <h1 className="text-[2.4rem] leading-none md:text-6xl">{t('explore.title')}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{t('explore.intro')}</p>

        <button
          type="button"
          onClick={() => setFinding(true)}
          className="group mt-6 flex w-full items-center gap-4 rounded-[1.75rem] bg-[linear-gradient(135deg,var(--coral),var(--primary)_70%)] p-4 text-left text-primary-foreground shadow-glow transition hover:shadow-lift md:p-5"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Sparkles className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg leading-tight font-semibold">{t('tripFinder.cta')}</span>
            <span className="block text-sm text-primary-foreground/85">{t('tripFinder.ctaBody')}</span>
          </span>
          <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
        </button>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1 basis-60">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => search(e.target.value)}
              list="explore-countries"
              placeholder={t('explore.search')}
              aria-label={t('explore.search')}
              className="pl-10"
            />
            <datalist id="explore-countries">
              {names.map((n) => (
                <option key={n.code} value={n.name} />
              ))}
            </datalist>
          </label>
          {session && visited.size > 0 && (
            <button
              type="button"
              aria-pressed={showVisited}
              onClick={() => setShowVisited((on) => !on)}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition',
                showVisited ? 'bg-[#f4a950]/25 text-foreground' : 'bg-foreground/[0.05] text-muted-foreground',
              )}
            >
              <Stamp className="size-4" />
              {t('explore.visited', { count: visited.size })}
            </button>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-[2.5rem] bg-[radial-gradient(circle_at_50%_40%,#2a1c25,#0d080b_70%)] p-3 shadow-lift md:p-6">
          {countries ? (
            <Globe
              countries={countries}
              selected={selected}
              focus={selected}
              highlighted={showVisited ? visited : undefined}
              dots={guidePlacePoints}
              onSelect={select}
              label={t('explore.globeLabel')}
              zoomInLabel={t('explore.zoomIn')}
              zoomOutLabel={t('explore.zoomOut')}
            />
          ) : (
            <Skeleton className="mx-auto aspect-square w-full max-w-[40rem] rounded-full bg-white/5" />
          )}
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[#fff8f1]/70">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#ffd08a]" />
              {t('explore.legendGuides')}
            </span>
            {session && visited.size > 0 && showVisited && (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#f4a950]/80" />
                {t('explore.legendVisited')}
              </span>
            )}
            <span>{t('explore.hint')}</span>
          </p>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t('explore.sources')}</p>
      </PageTransition>

      <TripFinder open={finding} onOpenChange={setFinding} onShowCountry={select} />
      <CountrySheet code={selected} facts={selected && countries ? (countries[selected] ?? null) : null} onClose={() => select(null)} />
    </GuideShell>
  )
}
