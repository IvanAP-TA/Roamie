/**
 * DEV ONLY — renders the trip screens with mock data so the UI can be reviewed without a
 * Supabase project. Mounted at /__preview only when import.meta.env.DEV (tree-shaken from builds).
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarRange, Compass, FerrisWheel, Map, Users } from 'lucide-react'
import { keys } from '@/hooks/useTrips'
import { TripContext } from '@/hooks/useTripContext'
import { AuroraBackground } from '@/components/brand/AuroraBackground'
import { AppHeader } from '@/components/layout/AppHeader'
import { DockNav } from '@/components/layout/DockNav'
import { DestinationDetailSheet } from '@/components/destinations/DestinationDetailSheet'
import { TicketCard } from '@/components/trips/TicketCard'
import { Button } from '@/components/ui/button'
import DestinationsTab from '@/pages/trip/DestinationsTab'
import MapTab from '@/pages/trip/MapTab'
import RouletteTab from '@/pages/trip/RouletteTab'
import ItineraryTab from '@/pages/trip/ItineraryTab'
import GroupTab from '@/pages/trip/GroupTab'
import PassportPage from '@/pages/PassportPage'
import PublicTripPage from '@/pages/PublicTripPage'
import { InspirationCard } from '@/components/guides/GuidesLink'
import type { Destination, ItineraryDay, PublicTrip, Trip, TripMember } from '@/lib/types'

const TRIP: Trip = {
  id: 'preview-trip',
  owner_id: 'u1',
  name: 'Estate 2027',
  description: 'Due settimane ad agosto, budget medio, niente voli all’alba.',
  cover_image_url: 'scene:0',
  cover_image_attribution: null,
  invite_code: 'K7PQ2MXA',
  created_at: '2026-09-01T10:00:00Z',
  public_slug: 'estate-2027-k7pq2mxa',
  date_window_start: '2027-07-01',
  date_window_end: '2027-08-15',
  trip_length: 5,
  roulette_spin_at: null,
  start_date: null,
  end_date: null,
}

const MEMBERS: TripMember[] = [
  { id: 'm1', trip_id: TRIP.id, user_id: 'u1', role: 'owner', joined_at: '2026-09-01T10:00:00Z', profile: { display_name: 'Giulia Rossi', avatar_url: null } },
  { id: 'm2', trip_id: TRIP.id, user_id: 'u2', role: 'editor', joined_at: '2026-09-02T10:00:00Z', profile: { display_name: 'Marco Bianchi', avatar_url: null } },
  { id: 'm3', trip_id: TRIP.id, user_id: 'u3', role: 'editor', joined_at: '2026-09-03T10:00:00Z', profile: { display_name: 'Sara Conti', avatar_url: null } },
  { id: 'm4', trip_id: TRIP.id, user_id: 'u4', role: 'viewer', joined_at: '2026-09-04T10:00:00Z', profile: { display_name: 'Luca Ferri', avatar_url: null } },
]

// Points given by members u2, u3, … (the preview user u1 hasn't voted yet, so the stepper starts at 0).
const votes = (points: number[]) => points.map((p, i) => ({ id: `v${Math.random()}`, user_id: `u${i + 2}`, points: p }))

const base = {
  trip_id: TRIP.id,
  image_url: null,
  image_attribution: null,
  selected_at: null,
  created_by: 'u2',
  comments: [{ count: 2 }],
  creator: MEMBERS[1].profile,
  country_code: null,
  visited_at: null,
  reviews: [],
}

const DESTINATIONS: Destination[] = [
  { ...base, id: 'd1', name: 'Lisbona', country: 'Portogallo', lat: 38.72, lng: -9.14, mood: ['culture', 'food_wine', 'nightlife'], budget_level: 2, expectations: 'Tramonti al Miradouro, pastéis de nata e tram che si arrampicano.', status: 'proposed', created_at: '2026-09-05T10:00:00Z', votes: votes([4, 3, 2]) },
  { ...base, id: 'd2', name: 'Isole Lofoten', country: 'Norvegia', lat: 68.2, lng: 13.6, mood: ['nature', 'adventure'], budget_level: 3, expectations: null, status: 'proposed', created_at: '2026-09-06T10:00:00Z', votes: votes([2, 1]) },
  { ...base, id: 'd3', name: 'Oaxaca', country: 'Messico', lat: 17.06, lng: -96.72, mood: ['food_wine', 'culture'], budget_level: 1, expectations: 'Mole, mezcal e mercati.', status: 'proposed', created_at: '2026-09-07T10:00:00Z', votes: votes([3, 2]) },
  { ...base, id: 'd4', name: 'Berlino', country: 'Germania', lat: 52.52, lng: 13.4, mood: ['nightlife'], budget_level: 2, expectations: null, status: 'proposed', created_at: '2026-09-08T10:00:00Z', votes: votes([]) },
  { ...base, id: 'd5', name: 'Kyoto', country: 'Giappone', lat: 35.01, lng: 135.77, mood: ['culture', 'romantic'], budget_level: 3, expectations: 'Templi, giardini zen e sentieri tra i bambù.', status: 'selected', selected_at: '2026-09-10T18:00:00Z', created_at: '2026-09-02T10:00:00Z', votes: votes([5, 4, 3]) },
  { ...base, id: 'd6', name: 'Porto', country: 'Portogallo', country_code: 'PT', lat: 41.15, lng: -8.61, mood: ['food_wine'], budget_level: 1, expectations: null, status: 'visited', selected_at: '2026-06-01T10:00:00Z', visited_at: '2026-07-10T10:00:00Z', created_at: '2026-05-02T10:00:00Z', votes: [], reviews: [{ id: 'r1', user_id: 'u2', rating: 5 }, { id: 'r2', user_id: 'u3', rating: 4 }] },
  { ...base, id: 'd7', name: 'Siviglia', country: 'Spagna', country_code: 'ES', lat: 37.39, lng: -5.98, mood: ['culture'], budget_level: 2, expectations: null, status: 'visited', selected_at: '2025-03-01T10:00:00Z', visited_at: '2025-04-12T10:00:00Z', created_at: '2025-02-02T10:00:00Z', votes: [] },
]

const DAYS: ItineraryDay[] = [
  {
    id: 'day1', trip_id: TRIP.id, day_number: 1, date: '2027-08-03', title: 'Arrivo e Gion',
    itinerary_items: [
      { id: 'i1', itinerary_day_id: 'day1', time: '14:00', title: 'Check-in al ryokan', description: 'Vicino a Shijo', order_index: 0, place_name: 'Shijō-dōri', lat: 35.0036, lng: 135.7681 },
      { id: 'i2', itinerary_day_id: 'day1', time: '17:30', title: 'Passeggiata a Gion', description: null, order_index: 1, place_name: 'Gion', lat: 35.0037, lng: 135.775 },
      { id: 'i3', itinerary_day_id: 'day1', time: '20:00', title: 'Cena a Pontocho', description: 'Prenotare!', order_index: 2, place_name: 'Pontochō', lat: 35.005, lng: 135.7708 },
    ],
  },
  {
    id: 'day2', trip_id: TRIP.id, day_number: 2, date: '2027-08-04', title: null,
    itinerary_items: [
      { id: 'i4', itinerary_day_id: 'day2', time: '07:30', title: 'Fushimi Inari all’alba', description: null, order_index: 0, place_name: 'Fushimi Inari Taisha', lat: 34.9671, lng: 135.7727 },
      { id: 'i5', itinerary_day_id: 'day2', time: null, title: 'Tofuku-ji', description: null, order_index: 1, place_name: 'Tōfuku-ji', lat: 34.9764, lng: 135.7737 },
    ],
  },
]

const TABS = { places: DestinationsTab, map: MapTab, roulette: RouletteTab, itinerary: ItineraryTab, group: GroupTab }

export default function PreviewTrip() {
  const { tab = 'places' } = useParams()
  const qc = useQueryClient()
  useState(() => {
    qc.setQueryDefaults(['trip', TRIP.id], { staleTime: Infinity, refetchOnWindowFocus: false })
    qc.setQueryDefaults(['comments'], { staleTime: Infinity, refetchOnWindowFocus: false })
    qc.setQueryData(keys.destinations(TRIP.id), DESTINATIONS)
    qc.setQueryData(
      ['passport', undefined, 'visits'],
      DESTINATIONS.filter((d) => d.status === 'visited').map((d) => ({ ...d, trip: { id: TRIP.id, name: TRIP.name } })),
    )
    qc.setQueryData(['passport', undefined, 'hidden'], [])
    qc.setQueryData(['passport', undefined, 'places'], [
      { id: 'p1', user_id: 'u1', name: 'Tokyo', country: 'Giappone', country_code: 'JP', lat: 35.68, lng: 139.69, visited_on: '2024-04-01', rating: 5, created_at: '2024-04-10T10:00:00Z' },
      { id: 'p2', user_id: 'u1', name: 'Marrakech', country: 'Marocco', country_code: 'MA', lat: 31.63, lng: -7.98, visited_on: '2023-11-01', rating: 4, created_at: '2023-11-20T10:00:00Z' },
    ])
    qc.setQueryData(['public-trip', undefined], {
      slug: TRIP.public_slug!,
      name: TRIP.name,
      description: TRIP.description,
      cover_image_url: TRIP.cover_image_url,
      cover_image_attribution: TRIP.cover_image_attribution,
      destinations: DESTINATIONS.map((d) => ({ ...d, points: d.votes.reduce((sum, v) => sum + v.points, 0) })),
      days: DAYS.map((day) => ({ ...day, items: day.itinerary_items })),
    } satisfies PublicTrip)
    qc.setQueryData(keys.itinerary(TRIP.id), DAYS)
    const range = (user: string, status: 'yes' | 'maybe', from: number, to: number) =>
      Array.from({ length: to - from + 1 }, (_, i) => ({ user_id: user, day: `2027-07-${String(from + i).padStart(2, '0')}`, status }))
    qc.setQueryDefaults(keys.availability(TRIP.id), { staleTime: Infinity })
    qc.setQueryData(keys.availability(TRIP.id), [
      ...range('u1', 'yes', 3, 20),
      ...range('u2', 'yes', 8, 16),
      ...range('u2', 'maybe', 17, 19),
      ...range('u3', 'yes', 10, 18),
      ...range('u4', 'maybe', 9, 13),
    ])
    qc.setQueryDefaults(['trip', TRIP.id, 'links'], { staleTime: Infinity })
    qc.setQueryData(keys.links(TRIP.id), [
      { id: 'l1', trip_id: TRIP.id, category: 'flight', title: 'Volo Milano–Lisbona', url: 'https://www.example.com/booking/ABC123', note: 'Codice ABC123 · bagaglio da stiva incluso', created_by: 'u1', created_at: '2026-09-10T10:00:00Z' },
      { id: 'l2', trip_id: TRIP.id, category: 'stay', title: 'Appartamento ad Alfama', url: 'https://www.example.org/stay/42', note: null, created_by: 'u2', created_at: '2026-09-11T10:00:00Z' },
    ])
    qc.setQueryDefaults(['trip', TRIP.id, 'checklist'], { staleTime: Infinity })
    qc.setQueryData(keys.checklist(TRIP.id), [
      { id: 'c1', trip_id: TRIP.id, kind: 'book', title: 'Prenotare il tram 28 all’alba', assignee_id: 'u2', done: false, done_at: null, created_by: 'u1', created_at: '2026-09-10T10:00:00Z' },
      { id: 'c2', trip_id: TRIP.id, kind: 'book', title: 'Biglietti per il Mosteiro dos Jerónimos', assignee_id: null, done: true, done_at: '2026-09-12T10:00:00Z', created_by: 'u1', created_at: '2026-09-10T11:00:00Z' },
      { id: 'c3', trip_id: TRIP.id, kind: 'pack', title: 'Scarpe comode per le salite', assignee_id: 'u3', done: false, done_at: null, created_by: 'u3', created_at: '2026-09-11T10:00:00Z' },
    ])
    qc.setQueryData(keys.comments('d1'), [
      { id: 'c1', destination_id: 'd1', user_id: 'u3', content: 'Io ci starei una settimana intera!', created_at: '2026-09-09T10:00:00Z', author: MEMBERS[2].profile },
      { id: 'c2', destination_id: 'd1', user_id: 'u1', content: 'Voli ad agosto ancora bassi 👀', created_at: '2026-09-12T10:00:00Z', author: MEMBERS[0].profile },
    ])
    return true
  })

  if (tab === 'public') return <PublicTripPage />

  if (tab === 'passport') {
    return (
      <div className="relative min-h-dvh pb-32">
        <AuroraBackground />
        <PassportPage />
      </div>
    )
  }

  if (tab === 'trips') {
    return (
      <div className="relative min-h-dvh p-5">
        <AuroraBackground />
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[TRIP, { ...TRIP, id: 't2', name: 'Weekend in montagna', cover_image_url: 'scene:2', description: null }].map((trip, i) => (
            <TicketCard
              key={trip.id}
              myRole={i ? 'editor' : 'owner'}
              trip={{ ...trip, trip_members: MEMBERS, destinations: [{ count: i ? 2 : 5 }] }}
            />
          ))}
        </div>
        <InspirationCard className="mx-auto mt-10 max-w-5xl" />
      </div>
    )
  }

  const Tab = TABS[tab as keyof typeof TABS] ?? DestinationsTab
  const p = '/__preview'

  return (
    <TripContext.Provider value={{ trip: TRIP, members: MEMBERS, me: MEMBERS[0], role: 'owner', isOwner: true, canEdit: true }}>
      <div className="relative min-h-dvh">
        <AuroraBackground />
        <AppHeader
          left={
            <Button asChild variant="glass" size="icon-sm">
              <Link to={`${p}/trips`}>
                <ArrowLeft />
              </Link>
            </Button>
          }
          title={TRIP.name}
        />
        <div className="pb-36 md:pb-12 md:pl-28">
          <Tab />
        </div>
        <DockNav
          layoutId="preview-dock"
          items={[
            { to: `${p}/places`, label: 'Mete', icon: Compass },
            { to: `${p}/map`, label: 'Mappa', icon: Map },
            { to: `${p}/roulette`, label: 'Ruota', icon: FerrisWheel, primary: true },
            { to: `${p}/itinerary`, label: 'Itinerario', icon: CalendarRange },
            { to: `${p}/group`, label: 'Gruppo', icon: Users },
          ]}
        />
        <DestinationDetailSheet />
      </div>
    </TripContext.Provider>
  )
}
