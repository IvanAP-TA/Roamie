import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { LanguageCode } from '@/i18n'
import { GUIDES, guidePath } from '@/content/guides/meta'
import { Scene } from '@/components/brand/Scene'
import { cn } from '@/lib/utils'

export function GuideCards({
  lang,
  exclude,
  limit,
  heading: Heading = 'h3',
  className,
}: {
  lang: LanguageCode
  exclude?: string
  limit?: number
  heading?: 'h2' | 'h3'
  className?: string
}) {
  const guides = GUIDES.filter((guide) => guide.id !== exclude).slice(0, limit)

  return (
    <ul className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {guides.map((guide) => (
        <li key={guide.id}>
          <Link
            to={guidePath(guide, lang)}
            className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-paper shadow-soft transition-shadow hover:shadow-lift"
          >
            <Scene seed={guide.id} className="h-28 transition-transform duration-500 group-hover:scale-[1.03]" />
            <div className="flex flex-1 flex-col gap-2 p-5">
              <Heading className="font-display text-xl leading-snug">{guide.title[lang]}</Heading>
              <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{guide.description[lang]}</p>
              <ArrowRight aria-hidden className="mt-auto size-4 text-primary transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
