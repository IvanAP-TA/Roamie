import { Fragment, useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'
import type { Polyline as LeafletPolyline } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from 'react-i18next'
import { FitToPins } from './TripMap'
import type { ItineraryDay, ItineraryItem } from '@/lib/types'
import { cn } from '@/lib/utils'

export const DAY_COLORS = ['#c24e27', '#4f7d5b', '#6b4a6e', '#e2603a', '#3f6f8f', '#8e3a4c', '#b7791f']
export const dayColor = (dayIndex: number) => DAY_COLORS[dayIndex % DAY_COLORS.length]

export const isLocated = (item: ItineraryItem): item is ItineraryItem & { lat: number; lng: number } => item.lat != null && item.lng != null

// Only a number, a palette colour and a delay go into the marker HTML, never user text. The stops pop in one after
// the other as the route reaches them (.roamie-stop-pop in index.css, off with reduced motion).
function stopIcon(n: number, color: string, delay: number | null) {
  return L.divIcon({
    html: `<div ${delay === null ? '' : 'class="roamie-stop-pop" '}style="${delay === null ? '' : `animation-delay:${delay.toFixed(2)}s;`}width:30px;height:30px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font:700 13px/1 'Instrument Sans Variable',system-ui;box-shadow:0 0 0 3px #fff,0 6px 12px rgba(80,30,10,.35)">${n}</div>`,
    className: 'roamie-stop',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  })
}

/** When the drawing starts: after FitToPins' second fit (450 ms), so the route is measured at its final zoom. */
const DRAW_START = 0.5
/** Each day's route takes this long to draw, and the next day starts when it ends. */
const DRAW_SECONDS = 0.9

/**
 * A day's dashed route that draws itself once, from the first stop to the last: a solid copy of the path, drawn with
 * the usual stroke-dashoffset trick, masks the dashed one, so the dashes stay still while the line grows. The mask is
 * removed at the end, so zooming and later edits behave as before.
 */
function DrawnRoute({ positions, color, delay }: { positions: [number, number][]; color: string; delay: number }) {
  const line = useRef<LeafletPolyline>(null)
  // Once, when the map opens: [] (React's dev double run cleans up the first one).
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const path = line.current?.getElement() as SVGPathElement | undefined
    const svg = path?.ownerSVGElement
    if (!path || !svg || !path.getTotalLength || !path.animate) return
    const NS = 'http://www.w3.org/2000/svg'
    const id = `route-draw-${Math.random().toString(36).slice(2)}`
    const mask = document.createElementNS(NS, 'mask')
    mask.id = id
    // In page units and far larger than any route: the default box is the path's own, which is flat for a straight line.
    mask.setAttribute('maskUnits', 'userSpaceOnUse')
    for (const [k, v] of Object.entries({ x: '-100000', y: '-100000', width: '200000', height: '200000' })) mask.setAttribute(k, v)
    const reveal = document.createElementNS(NS, 'path')
    reveal.setAttribute('fill', 'none')
    reveal.setAttribute('stroke', '#fff')
    reveal.setAttribute('stroke-width', '8')
    reveal.setAttribute('stroke-linecap', 'round')
    mask.append(reveal)
    let animation: Animation | undefined
    const cleanUp = () => {
      animation?.cancel()
      path.removeAttribute('mask')
      mask.remove()
    }
    const start = () => {
      const length = path.getTotalLength()
      reveal.setAttribute('d', path.getAttribute('d') ?? '')
      reveal.setAttribute('stroke-dasharray', `${length} ${length}`)
      animation = reveal.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], { duration: DRAW_SECONDS * 1000, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' })
      animation.onfinish = cleanUp
    }
    // Hidden (an empty mask) until it starts, so the whole route doesn't flash before drawing.
    svg.prepend(mask)
    path.setAttribute('mask', `url(#${id})`)
    const timer = setTimeout(start, (DRAW_START + delay) * 1000)
    return () => {
      clearTimeout(timer)
      cleanUp()
    }
  }, [])
  return <Polyline ref={line} positions={positions} pathOptions={{ color, weight: 3, opacity: 0.8, dashArray: '6 8' }} />
}

/** Itinerary stops with a place: numbered in visiting order, one dashed route and colour per day. */
export function StopsMap({ days, className }: { days: ItineraryDay[]; className?: string }) {
  const { t } = useTranslation()
  // The stops pop in only during the intro: icons are rebuilt on every render, and a new icon would pop in again.
  const [intro, setIntro] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setIntro(false), (DRAW_START + Math.max(1, days.length) * DRAW_SECONDS + 0.6) * 1000)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- once, for the days there when the map opens
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
            {stops.length > 1 && <DrawnRoute positions={stops.map((stop) => [stop.lat, stop.lng] as [number, number])} color={color} delay={dayIndex * DRAW_SECONDS} />}
            {stops.map((stop, index) => (
              <Marker
                key={stop.id}
                position={[stop.lat, stop.lng]}
                icon={stopIcon(index + 1, color, !intro ? null : DRAW_START + dayIndex * DRAW_SECONDS + (stops.length > 1 ? (index / (stops.length - 1)) * DRAW_SECONDS * 0.8 : 0))}
                title={stop.title}
              >
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
