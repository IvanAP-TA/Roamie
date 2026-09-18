import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, Car, Clock, Coins, ExternalLink, Flame, Languages, Plane, Plus, Ticket } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GUIDE_CONTENT, type GuidePlace } from '@/content/guides/content'
import { guidePlaceImage } from '@/content/guides/images'
import { GUIDES, guidePath, type GuideMeta } from '@/content/guides/meta'
import type { LanguageCode } from '@/i18n'
import { useTrendingPlaces } from '@/hooks/useTrendingPlaces'
import { countryName, currencyName, hoursFromUser, languageName, utcLabel, type CountryFacts } from '@/lib/countries'
import { flagEmoji } from '@/lib/flags'
import { useOrigin } from '@/lib/origin'
import { flightFrom, localCosts, type Range } from '@/lib/tripCost'
import { serializeAttribution } from '@/lib/wikimedia'
import { ClimateCard } from '@/components/destinations/ClimateCard'
import { OriginSelect } from '@/components/destinations/OriginSelect'
import { AddToTripSheet } from '@/components/guides/AddToTripSheet'
import { CoverImage } from '@/components/media/CoverImage'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'

/** Places from the guides, by country. */
const GUIDE_PLACES = (() => {
  const byCountry = new Map<string, { place: GuidePlace; guide: GuideMeta }[]>()
  const seen = new Set<string>()
  for (const guide of GUIDES) {
    for (const place of GUIDE_CONTENT[guide.id]?.places ?? []) {
      if (seen.has(place.key)) continue
      seen.add(place.key)
      byCountry.set(place.countryCode, [...(byCountry.get(place.countryCode) ?? []), { place, guide }])
    }
  }
  return byCountry
})()

export const guidePlacePoints = [...GUIDE_PLACES.values()].flat().map(({ place }) => ({ lat: place.lat, lng: place.lng }))

function Fact({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.25rem] bg-foreground/[0.04] p-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-snug font-semibold">{children}</dd>
    </div>
  )
}

/** Everything useful about a country picked on the globe: time, money, languages, costs, climate, ideas. */
export function CountrySheet({ code, facts, onClose }: { code: string | null; facts: CountryFacts | null; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'it') as LanguageCode
  const [origin] = useOrigin()
  const { data: trending } = useTrendingPlaces(24)
  const [adding, setAdding] = useState<GuidePlace | null>(null)
  // Keep the last country on screen while the sheet animates out.
  const [shown, setShown] = useState<{ code: string; facts: CountryFacts } | null>(null)
  if (code && facts && shown?.code !== code) setShown({ code, facts })

  const euros = useMemo(() => {
    const format: Intl.NumberFormat & { formatRange?: (a: number, b: number) => string } = new Intl.NumberFormat(lang, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    })
    return { one: (n: number) => format.format(n), range: ({ low, high }: Range) => format.formatRange?.(low, high) ?? `${format.format(low)}–${format.format(high)}` }
  }, [lang])

  if (!shown) return null
  const { code: country, facts: f } = shown
  const name = countryName(country, lang)
  const [lat, lng] = f.capital
  const hours = f.tz ? hoursFromUser(f.tz) : null
  const time = f.tz ? new Intl.DateTimeFormat(lang, { timeZone: f.tz, hour: '2-digit', minute: '2-digit' }).format(new Date()) : null
  const flight = origin === country ? 'home' : flightFrom(origin, lat, lng)
  const local = localCosts(country)
  const places = GUIDE_PLACES.get(country) ?? []
  const hot = (trending ?? []).filter((p) => p.country_code === country)
  const signedHours = (value: number) => `${value > 0 ? '+' : '−'}${String(Math.abs(value)).replace('.', lang === 'en' ? '.' : ',')}`

  return (
    <>
      <Sheet
        open={code !== null}
        onOpenChange={(open) => !open && onClose()}
        title={`${flagEmoji(country)} ${name}`}
        description={f.capitalName ? t('explore.capital', { city: f.capitalName[lang] }) : undefined}
        className="md:max-w-xl"
      >
        <div className="space-y-5 pb-2">
          <dl className="grid grid-cols-2 gap-2">
            {time && (
              <Fact icon={Clock} label={t('explore.localTime')}>
                {time}
                {hours != null && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {hours === 0 ? t('explore.sameTime') : t('explore.timeDiff', { hours: signedHours(hours) })}
                    {f.utc && f.utc[0] !== f.utc[1] && ` · ${t('explore.manyZones')}`}
                  </span>
                )}
              </Fact>
            )}
            {f.currencies.length > 0 && (
              <Fact icon={Coins} label={t('explore.currency')}>
                {f.currencies.map((c) => `${currencyName(c, lang)} (${c})`).join(', ')}
              </Fact>
            )}
            {f.languages.length > 0 && (
              <Fact icon={Languages} label={t('explore.languages')}>
                {f.languages.map((l) => languageName(l, lang)).join(', ')}
              </Fact>
            )}
            {f.drive && (
              <Fact icon={Car} label={t('explore.driving')}>
                {t(f.drive === 'left' ? 'explore.left' : 'explore.right')}
                {f.utc && <span className="block text-xs font-normal text-muted-foreground">{utcLabel(f.utc)}</span>}
              </Fact>
            )}
          </dl>

          <section className="rounded-[1.5rem] bg-foreground/[0.03] p-4">
            <h3 className="font-sans text-xs font-bold tracking-wide text-primary uppercase">{t('explore.costs')}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background/60 text-muted-foreground">
                  <Plane className="size-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground">
                  {t('cost.flightFrom')} <OriginSelect label={t('cost.origin')} />
                </span>
                <span className="text-right font-medium tabular-nums">
                  {flight === 'home' ? t('explore.home') : flight === 'near' ? t('cost.flightNear') : euros.range(flight)}
                </span>
              </li>
              {local && (
                <>
                  <li className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background/60 text-muted-foreground">
                      <BedDouble className="size-4" />
                    </span>
                    <span className="flex-1 text-muted-foreground">{t('cost.stay')}</span>
                    <span className="font-medium tabular-nums">{t('cost.perNight', { amount: euros.one(local.night) })}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background/60 text-muted-foreground">
                      <Ticket className="size-4" />
                    </span>
                    <span className="flex-1 text-muted-foreground">{t('cost.daily')}</span>
                    <span className="font-medium tabular-nums">{t('cost.perDay', { amount: euros.one(local.day) })}</span>
                  </li>
                </>
              )}
            </ul>
            <p className="mt-3 text-[0.65rem] leading-relaxed text-muted-foreground">{t('explore.costsNote')}</p>
          </section>

          {/* The capital's climate: a whole country can't have one, and the card says so. */}
          <ClimateCard lat={lat} lng={lng} broadArea />

          {places.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xl">{t('explore.inGuides')}</h3>
              <ul className="space-y-2">
                {places.map(({ place, guide }) => {
                  const photo = guidePlaceImage(place.key)
                  return (
                    <li key={place.key} className="flex items-center gap-3 rounded-[1.25rem] bg-foreground/[0.04] p-2">
                      <CoverImage
                        url={photo?.url}
                        attribution={photo ? serializeAttribution(photo.attribution) : null}
                        seed={place.key}
                        showAttribution={false}
                        sizes="64px"
                        className="size-16 shrink-0 rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{place.name[lang]}</p>
                        <Link to={`${guidePath(guide, lang)}#${place.key}`} className="line-clamp-1 text-xs text-muted-foreground underline-offset-2 hover:underline">
                          {guide.title[lang]}
                        </Link>
                      </div>
                      <Button size="icon-sm" variant="glass" onClick={() => setAdding(place)} aria-label={t('guides.addTitle', { place: place.name[lang] })}>
                        <Plus />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {hot.length > 0 && (
            <section className="space-y-2">
              <h3 className="inline-flex items-center gap-1.5 text-xl">
                <Flame className="size-4 text-primary" />
                {t('explore.trending')}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {hot.map((p) => (
                  <span key={p.rank} className="rounded-full bg-foreground/[0.05] px-3 py-1 text-sm">
                    {p.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-col gap-2 text-sm">
            <a
              href={`https://${lang}.wikivoyage.org/w/index.php?search=${encodeURIComponent(name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
            >
              <ExternalLink className="size-4" />
              {t('explore.wikivoyage', { country: name })}
            </a>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('explore.safety')}{' '}
              {lang === 'it' && (
                <a href="https://www.viaggiaresicuri.it/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  Viaggiare Sicuri
                </a>
              )}
            </p>
          </div>
        </div>
      </Sheet>
      <AddToTripSheet place={adding} lang={lang} onClose={() => setAdding(null)} />
    </>
  )
}
