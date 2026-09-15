import images from './images.json'
import { GUIDE_CONTENT } from './content'
import type { ImageAttribution } from '@/lib/types'

/** A freely licensed Commons photo per guide place, picked once by scripts/guide-images.mjs. */
export interface GuideImage {
  url: string
  width: number
  height: number
  attribution: ImageAttribution
}

const GUIDE_IMAGES = images as Record<string, GuideImage>

export const guidePlaceImage = (placeKey: string): GuideImage | null => GUIDE_IMAGES[placeKey] ?? null

/** The guide's cover: the photo of its first place that has one. Guides without places keep their illustration. */
export function guideCoverImage(guideId: string): GuideImage | null {
  for (const place of GUIDE_CONTENT[guideId]?.places ?? []) {
    const image = guidePlaceImage(place.key)
    if (image) return image
  }
  return null
}
