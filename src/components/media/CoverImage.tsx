import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { Scene } from '@/components/brand/Scene'
import { AttributionChip } from './Attribution'
import { cn, safeImageUrl } from '@/lib/utils'
import { commonsSrcSet } from '@/lib/wikimedia'

export const SCENE_PREFIX = 'scene:'

/**
 * Photo when we have a real one, otherwise an illustrated scene (with a location pin when
 * `pin` is set) — never an unrelated stock image. Also falls back if the photo fails to load.
 */
export function CoverImage({
  url,
  attribution,
  seed,
  className,
  imgClassName,
  children,
  pin = false,
  showAttribution = true,
  attributionClassName,
  sizes,
  priority = false,
}: {
  url: string | null | undefined
  attribution?: string | null
  seed: string
  className?: string
  imgClassName?: string
  children?: React.ReactNode
  pin?: boolean
  showAttribution?: boolean
  attributionClassName?: string
  /** How wide the image is shown (the `sizes` attribute), so a Commons photo is fetched at a fitting width */
  sizes?: string
  /** The page's main image: loaded right away and first */
  priority?: boolean
}) {
  // Remember which URL failed, so switching to another photo tries loading it again.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const isScene = Boolean(url?.startsWith(SCENE_PREFIX))
  const photoUrl = isScene ? null : safeImageUrl(url)
  const srcSet = photoUrl && sizes ? commonsSrcSet(photoUrl) : undefined

  if (!photoUrl || failedUrl === photoUrl) {
    const sceneSeed = isScene ? url!.slice(SCENE_PREFIX.length) : seed
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <Scene seed={sceneSeed} className="absolute inset-0">
          {pin && <MapPin className="size-9 -translate-y-3 text-white/90 drop-shadow-md" strokeWidth={1.8} />}
        </Scene>
        {children}
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      <img
        key={photoUrl}
        src={photoUrl}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt=""
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        crossOrigin="anonymous"
        referrerPolicy="strict-origin-when-cross-origin"
        onError={() => setFailedUrl(photoUrl)}
        className={cn('absolute inset-0 size-full object-cover', imgClassName)}
      />
      {children}
      {showAttribution && attribution && (
        <AttributionChip raw={attribution} className={cn('absolute right-2.5 bottom-2.5 z-10', attributionClassName)} />
      )}
    </div>
  )
}
