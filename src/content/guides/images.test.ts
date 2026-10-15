import { describe, expect, it } from 'vitest'
import images from './images.json'
import { guidePhotoSrcSet, guidePlaceImage } from './images'

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
