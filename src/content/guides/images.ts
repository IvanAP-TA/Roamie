import images from './images.json'
import { GUIDE_CONTENT } from './content'
import { guideCover, type GuideImage } from './covers'

export { guidePhotoSrcSet, type GuideImage } from './covers'

type PlaceImage = Omit<GuideImage, 'key'>
const GUIDE_IMAGES = images as Record<string, PlaceImage>

/** A place's photo, picked once by scripts/guide-images.mjs. */
export function guidePlaceImage(placeKey: string): GuideImage | null {
  const image = GUIDE_IMAGES[placeKey]
  return image ? { ...image, key: placeKey } : null
}

/** The photo of a guide's first place that has one: what its cover should be (covers.json, checked by the tests). */
export function firstPlaceImage(guideId: string): GuideImage | null {
  for (const place of GUIDE_CONTENT[guideId]?.places ?? []) {
    const image = guidePlaceImage(place.key)
    if (image) return image
  }
  return null
}

/** The guide's cover (covers.ts). */
export const guideCoverImage = guideCover
