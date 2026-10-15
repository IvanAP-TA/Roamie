import { useEffect, useMemo, useRef, useState } from 'react'
import { geoContains, geoDistance, geoGraticule10, geoOrthographic, geoPath, geoCentroid } from 'd3-geo'
import type { Feature, Geometry, MultiLineString } from 'geojson'
import { feature, mesh } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import { Minus, Plus } from 'lucide-react'
import type { CountryTable } from '@/lib/countries'
import { cn } from '@/lib/utils'

/**
 * A dark globe drawn on a canvas with an orthographic projection (d3-geo, Natural Earth borders from world-atlas):
 * drag to turn it, pinch or scroll to zoom, tap a country to pick it. Countries too small for the 1:110m map
 * (Malta, Singapore…) are dots at their capital.
 */

type CountryFeature = Feature<Geometry, { name: string }> & {
  code: string | null
  /** A circle on the sphere holding the whole country: its centre, and its angular radius in radians */
  center: [number, number]
  reach: number
  /** Its rings as [lng, lat, lng, lat, …] in radians, for drawing it without d3 when it's wholly in sight */
  rings: Float64Array[]
}

/** A border or coast line, with a circle on the sphere holding it (as for countries) */
interface Line {
  coordinates: [number, number][]
  points: Float64Array
  center: [number, number]
  reach: number
}

const RADIANS = Math.PI / 180

/** [[lng, lat], …] in degrees → [lng, lat, lng, lat, …] in radians */
function radians(coordinates: number[][]): Float64Array {
  const points = new Float64Array(coordinates.length * 2)
  coordinates.forEach(([lng, lat], i) => {
    points[2 * i] = lng * RADIANS
    points[2 * i + 1] = lat * RADIANS
  })
  return points
}

/** Splits a mesh into its lines, each with the circle that holds it, so lines out of sight can be skipped. */
function lines(mesh: MultiLineString): Line[] {
  return mesh.coordinates.map((coordinates) => {
    const center = geoCentroid({ type: 'LineString', coordinates })
    let reach = 0
    for (const point of coordinates) reach = Math.max(reach, geoDistance(center, point as [number, number]))
    return { coordinates: coordinates as [number, number][], points: radians(coordinates), center, reach }
  })
}

/** Every [lng, lat] of a country's outline. */
function* vertices(geometry: Geometry): Generator<[number, number]> {
  const rings = geometry.type === 'Polygon' ? geometry.coordinates : geometry.type === 'MultiPolygon' ? geometry.coordinates.flat() : []
  for (const ring of rings) for (const point of ring) yield point as [number, number]
}

export interface GlobeDot {
  lat: number
  lng: number
}

// Three shapes on the map without an ISO number: picked as the country they are recognised as part of.
const BY_NAME: Record<string, string> = { Kosovo: 'XK', 'N. Cyprus': 'CY', Somaliland: 'SO' }

const COLORS = {
  glow: 'rgba(255, 138, 101, 0.20)',
  oceanCenter: '#2b1e2b',
  oceanEdge: '#110b10',
  graticule: 'rgba(255, 248, 241, 0.05)',
  land: '#3b2c37',
  landHover: '#54404d',
  visited: 'rgba(244, 169, 80, 0.72)',
  selected: '#ff7a5c',
  border: 'rgba(255, 240, 225, 0.5)',
  coast: 'rgba(255, 240, 225, 0.78)',
  rim: 'rgba(255, 248, 241, 0.16)',
  dot: '#ffd08a',
  small: 'rgba(255, 240, 225, 0.85)',
}

const MIN_ZOOM = 1
const MAX_ZOOM = 6

export function Globe({
  countries,
  selected,
  highlighted,
  dots = [],
  focus,
  onSelect,
  label,
  zoomInLabel,
  zoomOutLabel,
  className,
}: {
  countries: CountryTable
  selected: string | null
  /** Countries filled in gold (the user's visited countries) */
  highlighted?: ReadonlySet<string>
  /** Small gold points (places from the guides) */
  dots?: GlobeDot[]
  /** Turn to this country when it changes */
  focus?: string | null
  onSelect: (code: string) => void
  label: string
  zoomInLabel: string
  zoomOutLabel: string
  className?: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [topology, setTopology] = useState<Topology | null>(null)
  const [size, setSize] = useState(0)
  const view = useRef({ rotation: [-12, -38] as [number, number], zoom: 1, hover: null as string | null, spinning: true })
  const drawRef = useRef<() => void>(() => undefined)
  const animation = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void import('world-atlas/countries-110m.json').then((module) => {
      if (!cancelled) setTopology(module.default as unknown as Topology)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const byNumber = useMemo(() => {
    const map = new Map<string, string>()
    for (const [code, facts] of Object.entries(countries)) if (facts.num) map.set(facts.num, code)
    return map
  }, [countries])

  const shapes = useMemo(() => {
    if (!topology) return null
    const object = topology.objects.countries as GeometryCollection<{ name: string }>
    const features = (feature(topology, object) as unknown as { features: Feature<Geometry, { name: string }>[] }).features.map((f) => {
      const center = geoCentroid(f)
      let reach = 0
      for (const point of vertices(f.geometry)) reach = Math.max(reach, geoDistance(center, point))
      const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : []
      const rings = polygons.flat().map(radians)
      return { ...f, code: (f.id != null ? byNumber.get(String(f.id)) : undefined) ?? BY_NAME[f.properties.name] ?? null, center, reach, rings }
    }) as CountryFeature[]
    const drawn = new Set(features.map((f) => f.code))
    return {
      features,
      borders: lines(mesh(topology, object, (a, b) => a !== b)),
      coast: lines(mesh(topology, object, (a, b) => a === b)),
      // Too small for this map: a dot at the capital.
      small: Object.entries(countries)
        .filter(([code]) => !drawn.has(code))
        .map(([code, facts]) => ({ code, lat: facts.capital[0], lng: facts.capital[1] })),
    }
  }, [topology, byNumber, countries])

  // Size: the container's width, capped by the screen height.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = (width: number) => setSize(Math.floor(Math.min(width, window.innerHeight * 0.72, 760)))
    // Measured right away too: the observer's first report can come late (or not at all in a background tab).
    measure(el.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const projection = useMemo(() => geoOrthographic().clipAngle(90).precision(0.4), [])
  // Countries and lines across the horizon: 1:110m outlines have short segments, so they need no resampling (the
  // sphere's rim and the graticule's long lines do). Those wholly in sight skip d3 altogether (see the drawing).
  const clipped = useMemo(() => geoOrthographic().clipAngle(90).precision(0), [])
  const graticule = useMemo(() => geoGraticule10(), [])

  drawRef.current = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !size) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (canvas.width !== size * dpr) {
      canvas.width = size * dpr
      canvas.height = size * dpr
    }
    const { rotation, zoom, hover } = view.current
    const radius = (size / 2) * 0.9 * zoom
    // Every frame is drawn the same way, in motion or not: a cheaper draft while turning made the coasts brighten
    // each time the finger stopped.
    for (const p of [projection, clipped]) p.scale(radius).translate([size / 2, size / 2]).rotate([rotation[0], rotation[1], 0])
    const path = geoPath(projection, ctx)
    const center: [number, number] = [-rotation[0], -rotation[1]]

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)

    const glow = ctx.createRadialGradient(size / 2, size / 2, radius * 0.9, size / 2, size / 2, radius * 1.12)
    glow.addColorStop(0, COLORS.glow)
    glow.addColorStop(1, 'rgba(255, 138, 101, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, size, size)

    const ocean = ctx.createRadialGradient(size * 0.42, size * 0.38, radius * 0.1, size / 2, size / 2, radius)
    ocean.addColorStop(0, COLORS.oceanCenter)
    ocean.addColorStop(1, COLORS.oceanEdge)
    ctx.beginPath()
    path({ type: 'Sphere' })
    ctx.fillStyle = ocean
    ctx.fill()

    ctx.beginPath()
    path(graticule)
    ctx.strokeStyle = COLORS.graticule
    ctx.lineWidth = 0.6
    ctx.stroke()

    if (shapes) {
      // One path and one fill per colour rather than per country: filling is what costs on a phone, and the
      // globe is redrawn on every frame while it turns.
      // Countries on the far side are skipped; those wholly on this side need no clipping.
      const byFill = new Map<string, CountryFeature[]>()
      const whole = new Set<CountryFeature>()
      for (const f of shapes.features) {
        const distance = geoDistance(center, f.center)
        if (distance - f.reach > Math.PI / 2) continue
        if (distance + f.reach < Math.PI / 2 - 0.01) whole.add(f)
        const fill =
          f.code && f.code === selected
            ? COLORS.selected
            : f.code && highlighted?.has(f.code)
              ? COLORS.visited
              : f.code && f.code === hover
                ? COLORS.landHover
                : COLORS.land
        const group = byFill.get(fill)
        if (group) group.push(f)
        else byFill.set(fill, [f])
      }
      const pathEdge = geoPath(clipped, ctx)
      // What's wholly in sight needs no clipping, and is drawn without d3's projection stream: the same orthographic
      // projection (d3's rotation by longitude then latitude, without resampling), a few multiplications per point.
      const lambda = rotation[0] * RADIANS
      const cosPhi = Math.cos(rotation[1] * RADIANS)
      const sinPhi = Math.sin(rotation[1] * RADIANS)
      const half = size / 2
      const trace = (points: Float64Array, close: boolean) => {
        for (let i = 0; i < points.length; i += 2) {
          const lng = points[i] + lambda
          const cosLat = Math.cos(points[i + 1])
          const x = Math.cos(lng) * cosLat
          const y = Math.sin(lng) * cosLat
          const k = Math.sin(points[i + 1]) * cosPhi + x * sinPhi
          if (i === 0) ctx.moveTo(half + radius * y, half - radius * k)
          else ctx.lineTo(half + radius * y, half - radius * k)
        }
        if (close) ctx.closePath()
      }
      for (const [fill, group] of byFill) {
        ctx.beginPath()
        for (const f of group) {
          if (whole.has(f)) for (const ring of f.rings) trace(ring, true)
          else pathEdge(f)
        }
        ctx.fillStyle = fill
        ctx.fill()
      }
      // Borders and coasts the same way: lines out of sight skipped, those wholly in sight not clipped.
      const strokeLines = (all: Line[], color: string, width: number) => {
        const atEdge: [number, number][][] = []
        ctx.beginPath()
        for (const line of all) {
          const distance = geoDistance(center, line.center)
          if (distance - line.reach > Math.PI / 2) continue
          if (distance + line.reach < Math.PI / 2 - 0.01) trace(line.points, false)
          else atEdge.push(line.coordinates)
        }
        pathEdge({ type: 'MultiLineString', coordinates: atEdge })
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.stroke()
      }
      strokeLines(shapes.borders, COLORS.border, 0.6)
      strokeLines(shapes.coast, COLORS.coast, 0.8)

      const picked = shapes.features.find((f) => f.code && f.code === selected)
      if (picked) {
        ctx.beginPath()
        path(picked)
        ctx.strokeStyle = '#fff8f1'
        ctx.lineWidth = 1.4
        ctx.stroke()
      }

      const visible = (lng: number, lat: number) => geoDistance([lng, lat], center) < Math.PI / 2 - 0.02
      for (const dot of dots) {
        if (!visible(dot.lng, dot.lat)) continue
        const point = projection([dot.lng, dot.lat])
        if (!point) continue
        ctx.beginPath()
        ctx.arc(point[0], point[1], 2.4, 0, Math.PI * 2)
        ctx.fillStyle = COLORS.dot
        ctx.fill()
      }
      for (const small of shapes.small) {
        if (!visible(small.lng, small.lat)) continue
        const point = projection([small.lng, small.lat])
        if (!point) continue
        const isSelected = small.code === selected
        const isHighlighted = highlighted?.has(small.code)
        ctx.beginPath()
        ctx.arc(point[0], point[1], isSelected ? 5 : 3, 0, Math.PI * 2)
        ctx.fillStyle = isSelected ? COLORS.selected : isHighlighted ? COLORS.visited : COLORS.land
        ctx.fill()
        ctx.lineWidth = 1
        ctx.strokeStyle = isSelected ? '#fff8f1' : COLORS.small
        ctx.stroke()
      }
    }

    ctx.beginPath()
    path({ type: 'Sphere' })
    ctx.strokeStyle = COLORS.rim
    ctx.lineWidth = 1
    ctx.stroke()
  }

  const redraw = () => drawRef.current()

  // Pointer and wheel events can come several times a frame: the globe is drawn once per frame.
  const pendingFrame = useRef(0)
  const redrawMoving = () => {
    if (pendingFrame.current) return
    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = 0
      drawRef.current()
    })
  }
  useEffect(() => () => cancelAnimationFrame(pendingFrame.current), [])

  useEffect(redraw, [size, shapes, selected, highlighted, dots]) // eslint-disable-line react-hooks/exhaustive-deps

  // A slow turn until the first touch, on computers only and unless reduced motion is asked for. Each frame redraws
  // the whole globe, which would keep a phone's main thread busy and every tap on the page slow; on computers too,
  // 30 frames a second are enough for a turn this slow, none while the globe is scrolled out of sight, and it comes
  // to rest after half a minute.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!shapes || !canvas || !matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      view.current.spinning = false
      return
    }
    let inSight = true
    const observer = new IntersectionObserver(([entry]) => (inSight = entry.isIntersecting))
    observer.observe(canvas)
    const started = performance.now()
    let last = started
    let frame = 0
    const tick = (now: number) => {
      if (!view.current.spinning) return
      if (now - started > 30_000) {
        view.current.spinning = false
        drawRef.current()
        return
      }
      if (now - last >= 33) {
        if (inSight && document.visibilityState === 'visible') {
          // 0.08° per 60 Hz frame, whatever the frame rate.
          view.current.rotation[0] += (now - last) * 0.0048
          drawRef.current()
        }
        last = now
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [shapes])

  const stopSpinning = () => {
    view.current.spinning = false
    if (animation.current) cancelAnimationFrame(animation.current)
    animation.current = null
  }

  // Turn smoothly to a country picked from the list (or on the globe).
  useEffect(() => {
    if (!focus || !shapes) return
    const target = shapes.features.find((f) => f.code === focus)
    const facts = countries[focus]
    const [lng, lat] = target ? geoCentroid(target) : facts ? [facts.capital[1], facts.capital[0]] : [null, null]
    if (lng == null || lat == null) return
    stopSpinning()
    const from = [...view.current.rotation] as [number, number]
    // The shortest way round.
    let dLng = -lng - from[0]
    dLng = ((((dLng + 180) % 360) + 360) % 360) - 180
    const to: [number, number] = [from[0] + dLng, Math.max(-70, Math.min(70, -lat))]
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 700)
      const ease = 1 - (1 - t) ** 3
      view.current.rotation = [from[0] + (to[0] - from[0]) * ease, from[1] + (to[1] - from[1]) * ease]
      drawRef.current()
      animation.current = t < 1 ? requestAnimationFrame(step) : null
    }
    animation.current = requestAnimationFrame(step)
  }, [focus, shapes, countries])

  const hitTest = (x: number, y: number): string | null => {
    if (!shapes) return null
    const center: [number, number] = [-view.current.rotation[0], -view.current.rotation[1]]
    // Dots first: they are small, so be generous.
    for (const small of shapes.small) {
      if (geoDistance([small.lng, small.lat], center) > Math.PI / 2) continue
      const point = projection([small.lng, small.lat])
      if (point && Math.hypot(point[0] - x, point[1] - y) < 10) return small.code
    }
    const at = projection.invert?.([x, y])
    if (!at || geoDistance(at, center) > Math.PI / 2) return null
    return shapes.features.find((f) => f.code && geoContains(f, at))?.code ?? null
  }

  // Pointer handling: one finger or the mouse turns, two fingers zoom, a tap picks.
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef({ startX: 0, startY: 0, moved: 0, pinch: 0, zoom: 1, time: 0 })

  const local = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    stopSpinning()
    pointers.current.set(e.pointerId, local(e))
    const g = gesture.current
    if (pointers.current.size === 1) Object.assign(g, { startX: local(e).x, startY: local(e).y, moved: 0, time: performance.now() })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      g.pinch = Math.hypot(a.x - b.x, a.y - b.y)
      g.zoom = view.current.zoom
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = local(e)
    const previous = pointers.current.get(e.pointerId)
    if (!previous) {
      // Mouse hover: light up the country under the pointer.
      if (e.pointerType === 'mouse') {
        const code = hitTest(point.x, point.y)
        if (code !== view.current.hover) {
          view.current.hover = code
          e.currentTarget.style.cursor = code ? 'pointer' : 'grab'
          redraw()
        }
      }
      return
    }
    pointers.current.set(e.pointerId, point)
    const g = gesture.current
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (g.pinch > 0) view.current.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (g.zoom * distance) / g.pinch))
      g.moved += 10
      redrawMoving()
      return
    }
    const dx = point.x - previous.x
    const dy = point.y - previous.y
    g.moved += Math.abs(dx) + Math.abs(dy)
    const speed = 180 / (size * 0.9 * view.current.zoom)
    const [lng, lat] = view.current.rotation
    view.current.rotation = [lng + dx * speed, Math.max(-80, Math.min(80, lat - dy * speed))]
    redrawMoving()
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gesture.current
    const wasTap = pointers.current.size === 1 && g.moved < 8 && performance.now() - g.time < 500
    pointers.current.delete(e.pointerId)
    if (!wasTap) return
    const { x, y } = local(e)
    const code = hitTest(x, y)
    if (code) onSelect(code)
  }

  const zoomBy = (factor: number) => {
    stopSpinning()
    view.current.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.current.zoom * factor))
    redraw()
  }

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      stopSpinning()
      view.current.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.current.zoom * Math.exp(-e.deltaY * 0.0015)))
      redrawMoving()
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <div ref={wrapRef} className={cn('relative flex w-full justify-center', className)}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        style={{ width: size, height: size }}
        className="cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
        onPointerLeave={() => {
          if (view.current.hover) {
            view.current.hover = null
            redraw()
          }
        }}
      />
      <div className="absolute right-1 bottom-1 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => zoomBy(1.4)}
          aria-label={zoomInLabel}
          className="flex size-10 items-center justify-center rounded-full bg-[#1c1418]/80 text-[#fff8f1] shadow-soft backdrop-blur-md transition active:scale-90"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.4)}
          aria-label={zoomOutLabel}
          className="flex size-10 items-center justify-center rounded-full bg-[#1c1418]/80 text-[#fff8f1] shadow-soft backdrop-blur-md transition active:scale-90"
        >
          <Minus className="size-4" />
        </button>
      </div>
    </div>
  )
}
