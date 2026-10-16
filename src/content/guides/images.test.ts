import { describe, expect, it } from 'vitest'
import images from './images.json'
import covers from './covers.json'
import { GUIDES } from './meta'
import { firstPlaceImage, guideCoverImage, guidePhotoSrcSet, guidePlaceImage } from './images'

// The AVIF files in public/ (listed, not loaded).
const files = new Set(Object.keys(import.meta.glob('/public/guides/photos/*.avif')).map((path) => path.replace('/public', '')))

describe('guide photos', () => {
  it('has the AVIF copies of every photo (npm run guide-photos)', () => {
    const missing = Object.keys(images).flatMap((key) => {
      const image = guidePlaceImage(key)!
      return [guidePhotoSrcSet(image), guidePhotoSrcSet(image, true)]
        .flatMap((srcSet) => srcSet.split(', ').map((candidate) => candidate.split(' ')[0]))
        .filter((path) => !files.has(path))
    })
    expect(files.size).toBeGreaterThan(0)
    expect(missing).toEqual([])
  })
})

describe('guide covers (covers.json)', () => {
  it('gives every guide a cover, with its AVIF copies', () => {
    for (const guide of GUIDES) {
      const cover = guideCoverImage(guide.id)
      expect(cover, guide.id).not.toBeNull()
      const paths = [guidePhotoSrcSet(cover!), guidePhotoSrcSet(cover!, true)].flatMap((s) => s.split(', ').map((c) => c.split(' ')[0]))
      expect(paths.filter((path) => !files.has(path)), guide.id).toEqual([])
    }
  })

  it('uses the photo of the first place for a guide with places', () => {
    for (const guide of GUIDES) {
      const first = firstPlaceImage(guide.id)
      if (first) expect(guideCoverImage(guide.id), guide.id).toEqual(first)
    }
    expect(Object.keys(covers).sort()).toEqual(GUIDES.map((g) => g.id).sort())
  })
})
