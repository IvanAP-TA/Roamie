import { useMemo, type ReactNode } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { GuidePlace } from '@/content/guides/content'
import { bestMonthsLabel } from '@/content/guides/format'
import { guidePlaceImage } from '@/content/guides/images'
import type { LanguageCode } from '@/i18n'
import { flagEmoji } from '@/lib/flags'
import { serializeAttribution } from '@/lib/wikimedia'
import { BudgetIndicator, MoodTag } from '@/components/destinations/moods'
import { CoverImage } from '@/components/media/CoverImage'
import { Button } from '@/components/ui/button'

/** A place of the guides as a card: photo with its number, country, the guide's text, best time, budget, moods. */
export function GuidePlaceCard({
  place,
  index,
  lang,
  onAdd,
  footer,
}: {
  place: GuidePlace
  index: number
  lang: LanguageCode
  onAdd: (place: GuidePlace) => void
  /** Extra links under the button, e.g. the guide the place comes from */
  footer?: ReactNode
}) {
  const { t } = useTranslation(undefined, { lng: lang })
  const photo = guidePlaceImage(place.key)
  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([lang], { type: 'region' })
    } catch {
      return null
    }
  }, [lang])

  return (
    <li id={place.key} className="scroll-mt-6 overflow-hidden rounded-[2rem] bg-paper shadow-soft md:grid md:grid-cols-[13rem_1fr]">
      <CoverImage
        url={photo?.url}
        attribution={photo ? serializeAttribution(photo.attribution) : null}
        seed={place.key}
        sizes="(min-width: 768px) 208px, 100vw"
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
        <Button onClick={() => onAdd(place)} className="mt-1">
          <Plus />
          {t('guides.addToTrip')}
        </Button>
        {footer}
      </div>
    </li>
  )
}
