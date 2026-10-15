import images from './images.json'
import { GUIDE_CONTENT } from './content'
import type { ImageAttribution } from '@/lib/types'

/** A freely licensed Commons photo per guide place, picked once by scripts/guide-images.mjs. */
export interface GuideImage {
  /** The place's key, which also names its AVIF copies (scripts/guide-photos.mjs) */
  key: string
  url: string
  width: number
  height: number
  attribution: ImageAttribution
}

const GUIDE_IMAGES = images as Record<string, Omit<GuideImage, 'key'>>

export function guidePlaceImage(placeKey: string): GuideImage | null {
  const image = GUIDE_IMAGES[placeKey]
  return image ? { ...image, key: placeKey } : null
}

const PHOTO_WIDTHS = [480, 960]

/**
 * The photo's AVIF copies on roamie.org, made by scripts/guide-photos.mjs, as a srcset: the whole photo, or (band)
 * its middle 3:1 strip, which is all a guide card shows. About a sixth of the weight of Wikimedia's JPEG, which stays
 * the fallback for browsers without AVIF.
 */
export const guidePhotoSrcSet = (image: GuideImage, band = false) =>
  PHOTO_WIDTHS.map((width) => `/guides/photos/${image.key}${band ? '-band' : ''}-${width}.avif ${width}w`).join(', ')

/** The guide's cover: the photo of its first place that has one. Guides without places keep their illustration. */
export function guideCoverImage(guideId: string): GuideImage | null {
  for (const place of GUIDE_CONTENT[guideId]?.places ?? []) {
    const image = guidePlaceImage(place.key)
    if (image) return image
  }
  return null
}
