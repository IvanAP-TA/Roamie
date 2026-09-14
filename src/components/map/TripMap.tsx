import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight } from 'lucide-react'
import { netScore } from '@/lib/roulette'
import type { Destination } from '@/lib/types'
import { cn, escapeHtml, safeImageUrl } from '@/lib/utils'

const STATUS_RING: Record<Destination['status'], string> = {
  proposed: '#ffffff',
  selected: '#f4a950',
  visited: '#4f7d5b',
}

function pinIcon(d: Destination) {
  const score = netScore(d)
  // safeImageUrl rejects quotes and backslashes, so the value can't break out of url('…').
  const photoUrl = safeImageUrl(d.image_url)
  const photo = photoUrl ? `background-image:url('${escapeHtml(photoUrl)}');` : ''
  const html = `
    <div style="position:relative;width:48px;height:58px;filter:drop-shadow(0 8px 12px rgba(120,50,20,.35))">
      <div style="position:absolute;left:0;top:0;width:48px;height:48px;border-radius:50% 50% 50% 8px;transform:rotate(-45deg);background:${STATUS_RING[d.status]};"></div>
      <div style="position:absolute;left:5px;top:5px;width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#ff9a6b,#c24e27);background-size:cover;background-position:center;${photo}"></div>
      ${
        score !== 0
          ? `<span style="position:absolute;right:-6px;top:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:${score > 0 ? '#c24e27' : '#6b4a6e'};color:#fff;font:600 11px/20px 'Instrument Sans Variable',system-ui;text-align:center;box-shadow:0 0 0 2px #fff">${score > 0 ? '+' : ''}${score}</span>`
          : ''
      }
    </div>`
  return L.divIcon({ html, className: 'roamie-pin', iconSize: [48, 58], iconAnchor: [10, 54], popupAnchor: [14, -50] })
}

function FitToPins({ points }: { points: [number, number][] }) {
  const map = useMap()
  const signature = points.map((p) => p.join(',')).join('|')
  useEffect(() => {
    if (points.length === 0) return
    const fit = () => {
      map.invalidateSize()
      if (points.length === 1) map.setView(points[0], 7, { animate: false })
      else map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 8, animate: false })
    }
    fit()
    // Fit again once the page transition has settled and the container has its final size.
    const timer = setTimeout(fit, 450)
    return () => clearTimeout(timer)
  }, [signature, map]) // eslint-disable-line react-hooks/exhaustive-deps -- `signature` encodes `points`
  return null
}

export function TripMap({
  destinations,
  onOpen,
  className,
}: {
  destinations: Destination[]
  onOpen: (id: string) => void
  className?: string
}) {
  const { t } = useTranslation()
  const pinned = useMemo(() => destinations.filter((d) => d.lat != null && d.lng != null), [destinations])
  const points = pinned.map((d) => [d.lat!, d.lng!] as [number, number])

  return (
    <MapContainer
      center={[41.9, 12.5]}
      zoom={4}
      minZoom={2}
      worldCopyJump
      zoomControl={false}
      className={cn('roamie-map z-0', className)}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
        crossOrigin="anonymous"
        maxZoom={19}
      />
      <FitToPins points={points} />
      {pinned.map((d) => (
        <Marker key={d.id} position={[d.lat!, d.lng!]} icon={pinIcon(d)} title={d.name}>
          <Popup closeButton={false} minWidth={200}>
            <button type="button" onClick={() => onOpen(d.id)} className="flex w-full items-center gap-3 p-3 text-left">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg leading-tight">{d.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.country} · {t(`status.${d.status}`)} · {t('votes.score', { count: netScore(d) })}
                </p>
              </div>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ArrowUpRight className="size-4" />
              </span>
            </button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
