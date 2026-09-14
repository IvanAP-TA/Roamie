import { useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from 'react-i18next'
import type { Stamp } from '@/lib/passport'
import { cn, escapeHtml, safeImageUrl } from '@/lib/utils'
import { FitToPins } from './TripMap'

// Ring colour tells group visits (sage) from personal places (sun).
const RING: Record<Stamp['kind'], string> = { trip: '#4f7d5b', personal: '#f4a950' }

function stampIcon(stamp: Stamp) {
  // safeImageUrl rejects quotes and backslashes, so the value can't break out of url('…').
  const photoUrl = safeImageUrl(stamp.imageUrl)
  const photo = photoUrl ? `background-image:url('${escapeHtml(photoUrl)}');` : ''
  const html = `
    <div style="position:relative;width:40px;height:48px;filter:drop-shadow(0 6px 10px rgba(120,50,20,.35))">
      <div style="position:absolute;left:0;top:0;width:40px;height:40px;border-radius:50% 50% 50% 8px;transform:rotate(-45deg);background:${RING[stamp.kind]};"></div>
      <div style="position:absolute;left:5px;top:5px;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#ff9a6b,#c24e27);background-size:cover;background-position:center;${photo}"></div>
    </div>`
  return L.divIcon({ html, className: 'roamie-pin', iconSize: [40, 48], iconAnchor: [8, 45], popupAnchor: [12, -42] })
}

export function StampMap({ stamps, onOpen, className }: { stamps: Stamp[]; onOpen: (stamp: Stamp) => void; className?: string }) {
  const { t } = useTranslation()
  const pinned = useMemo(() => stamps.filter((s) => s.lat != null && s.lng != null), [stamps])
  const points = pinned.map((s) => [s.lat!, s.lng!] as [number, number])

  return (
    <MapContainer center={[41.9, 12.5]} zoom={3} minZoom={2} worldCopyJump zoomControl={false} className={cn('roamie-map z-0', className)}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
        crossOrigin="anonymous"
        maxZoom={19}
      />
      <FitToPins points={points} maxZoom={6} singleZoom={5} />
      {pinned.map((stamp) => (
        <Marker key={stamp.key} position={[stamp.lat!, stamp.lng!]} icon={stampIcon(stamp)} title={stamp.name}>
          <Popup closeButton={false} minWidth={180}>
            <button type="button" onClick={() => onOpen(stamp)} className="block w-full p-3 text-left">
              <span className="block truncate font-display text-lg leading-tight">{stamp.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {[stamp.country, stamp.trip?.name ?? t('passport.personal')].filter(Boolean).join(' · ')}
              </span>
            </button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
