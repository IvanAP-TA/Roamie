import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { LanguageCode } from '@/i18n'
import { GUIDES, guidePath, type GuideMeta } from '@/content/guides/meta'
import { Scene } from '@/components/brand/Scene'
import { cn } from '@/lib/utils'
import { useTransitionNavigate } from '@/lib/viewTransition'

export interface GuideCardMedia {
  cover: ReactNode
  /** Rendered next to the link, not inside it: the photo credit is a button. */
  credit?: ReactNode
}

export function GuideCards({
  lang,
  exclude,
  limit,
  heading: Heading = 'h3',
  media,
  eager = 0,
  className,
}: {
  lang: LanguageCode
  exclude?: string
  limit?: number
  heading?: 'h2' | 'h3'
  /** Photos for the cards. Passed in rather than imported, so the landing page doesn't download them. */
  media?: (guide: GuideMeta, loading: { priority?: boolean; eager?: boolean }) => GuideCardMedia | null
  /** How many of the first cards are at the top of the page: their photos load right away instead of lazily, the
   * first photo among them (the page's main image) at a high priority */
  eager?: number
  className?: string
}) {
  const guides = GUIDES.filter((guide) => guide.id !== exclude).slice(0, limit)
  const firstPhoto = media ? guides.findIndex((guide) => media(guide, {}) !== null) : -1
  // The card's picture grows into the guide's cover (GuidePage).
  const open = useTransitionNavigate()

  return (
    <ul className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {guides.map((guide, index) => {
        const photo = media?.(guide, { priority: index === firstPhoto && index < eager, eager: index < eager })
        return (
          <li key={guide.id} className="relative">
            <Link
              to={guidePath(guide, lang)}
              onClick={(event) => open(event, guidePath(guide, lang), { name: 'guide-cover', to: '[data-vt="guide-hero"]' })}
              className="pressable group flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-paper shadow-soft hover:shadow-lift"
            >
              <div data-vt={`guide-${guide.id}`} className="h-28 overflow-hidden">
                {photo?.cover ?? <Scene seed={guide.id} className="h-full transition-transform duration-500 group-hover:scale-[1.03]" />}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <Heading className="font-display text-xl leading-snug">{guide.title[lang]}</Heading>
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{guide.description[lang]}</p>
                <ArrowRight aria-hidden className="mt-auto size-4 text-primary transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
            {photo?.credit}
          </li>
        )
      })}
    </ul>
  )
}
