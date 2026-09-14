import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { Scene } from '@/components/brand/Scene'
import { AttributionChip } from './Attribution'
import { cn, safeImageUrl } from '@/lib/utils'

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
}) {
  const [failed, setFailed] = useState(false)
  const isScene = Boolean(url?.startsWith(SCENE_PREFIX))
  const photoUrl = isScene ? null : safeImageUrl(url)

  if (!photoUrl || failed) {
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
        src={photoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        crossOrigin="anonymous"
        referrerPolicy="strict-origin-when-cross-origin"
        onError={() => setFailed(true)}
        className={cn('absolute inset-0 size-full object-cover', imgClassName)}
      />
      {children}
      {showAttribution && attribution && (
        <AttributionChip raw={attribution} className={cn('absolute right-2.5 bottom-2.5 z-10', attributionClassName)} />
      )}
    </div>
  )
}
