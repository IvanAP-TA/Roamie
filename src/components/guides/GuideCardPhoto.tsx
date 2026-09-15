import { guideCoverImage } from '@/content/guides/images'
import type { GuideMeta } from '@/content/guides/meta'
import { serializeAttribution } from '@/lib/wikimedia'
import { AttributionChip } from '@/components/media/Attribution'
import { CoverImage } from '@/components/media/CoverImage'
import type { GuideCardMedia } from './GuideCards'

/** For <GuideCards media={guideCardPhoto} />: the guide's cover photo and its credit, on pages that load guide content. */
export function guideCardPhoto(guide: GuideMeta): GuideCardMedia | null {
  const cover = guideCoverImage(guide.id)
  if (!cover) return null
  return {
    cover: (
      <CoverImage
        url={cover.url}
        seed={guide.id}
        showAttribution={false}
        sizes="(min-width: 1024px) 240px, (min-width: 640px) 50vw, 100vw"
        className="h-full transition-transform duration-500 group-hover:scale-[1.03]"
      />
    ),
    credit: <AttributionChip raw={serializeAttribution(cover.attribution)} className="absolute top-2.5 right-2.5 z-10" />,
  }
}
