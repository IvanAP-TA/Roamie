import covers from './covers.json'
import type { ImageAttribution } from '@/lib/types'

/** A freely licensed Commons photo, with its AVIF copies on roamie.org named after `key` (scripts/guide-photos.mjs). */
export interface GuideImage {
  key: string
  url: string
  width: number
  height: number
  attribution: ImageAttribution
}

/**
 * Each guide's cover: the photo of its first place (images.ts checks they match), or one chosen for a guide without
 * places. Kept apart from the guides' content so the landing page can show the covers without downloading the guides.
 */
const COVERS = covers as Record<string, GuideImage>

export const guideCover = (guideId: string): GuideImage | null => COVERS[guideId] ?? null

const PHOTO_WIDTHS = [480, 960]

/**
 * The photo's AVIF copies on roamie.org, made by scripts/guide-photos.mjs, as a srcset: the whole photo, or (band)
 * its middle 3:1 strip, which is all a guide card shows. About a sixth of the weight of Wikimedia's JPEG, which stays
 * the fallback for browsers without AVIF.
 */
export const guidePhotoSrcSet = (image: GuideImage, band = false) =>
  PHOTO_WIDTHS.map((width) => `/guides/photos/${image.key}${band ? '-band' : ''}-${width}.avif ${width}w`).join(', ')
