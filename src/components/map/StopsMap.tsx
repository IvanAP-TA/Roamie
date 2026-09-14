import { Fragment } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from 'react-i18next'
import { FitToPins } from './TripMap'
import type { ItineraryDay, ItineraryItem } from '@/lib/types'
import { cn } from '@/lib/utils'

export const DAY_COLORS = ['#c24e27', '#4f7d5b', '#6b4a6e', '#e2603a', '#3f6f8f', '#8e3a4c', '#b7791f']
export const dayColor = (dayIndex: number) => DAY_COLORS[dayIndex % DAY_COLORS.length]

export const isLocated = (item: ItineraryItem): item is ItineraryItem & { lat: number; lng: number } => item.lat != null && item.lng != null

// Only a number and a palette colour go into the marker HTML, never user text.
function stopIcon(n: number, color: string) {
  return L.divIcon({
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font:700 13px/1 'Instrument Sans Variable',system-ui;box-shadow:0 0 0 3px #fff,0 6px 12px rgba(80,30,10,.35)">${n}</div>`,
    className: 'roamie-stop',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  })
}

/** Itinerary stops with a place: numbered in visiting order, one dashed route and colour per day. */
export function StopsMap({ days, className }: { days: ItineraryDay[]; className?: string }) {
  const { t } = useTranslation()
  const points = days.flatMap((day) => day.itinerary_items.filter(isLocated).map((item) => [item.lat, item.lng] as [number, number]))

  return (
    <MapContainer center={[41.9, 12.5]} zoom={4} minZoom={2} worldCopyJump zoomControl={false} className={cn('roamie-map z-0', className)}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
        crossOrigin="anonymous"
        maxZoom={19}
      />
      <FitToPins points={points} maxZoom={15} singleZoom={14} />
      {days.map((day, dayIndex) => {
        const color = dayColor(dayIndex)
        const stops = day.itinerary_items.filter(isLocated)
        return (
          <Fragment key={day.id}>
            {stops.length > 1 && (
              <Polyline
                positions={stops.map((stop) => [stop.lat, stop.lng] as [number, number])}
                pathOptions={{ color, weight: 3, opacity: 0.8, dashArray: '6 8' }}
              />
            )}
            {stops.map((stop, index) => (
              <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={stopIcon(index + 1, color)} title={stop.title}>
                <Popup closeButton={false} minWidth={200}>
                  <div className="p-3">
                    <p className="text-[0.65rem] font-bold tracking-[0.14em] uppercase" style={{ color }}>
                      {t('itinerary.day', { n: day.day_number })}
                      {stop.time ? ` · ${stop.time.slice(0, 5)}` : ''}
                    </p>
                    <p className="font-display text-lg leading-tight">{stop.title}</p>
                    {stop.place_name && stop.place_name !== stop.title && <p className="text-xs text-muted-foreground">{stop.place_name}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </Fragment>
        )
      })}
    </MapContainer>
  )
}
