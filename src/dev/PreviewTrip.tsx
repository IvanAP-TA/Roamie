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
import type { Destination, ItineraryDay, Trip, TripMember, VoteType } from '@/lib/types'

const TRIP: Trip = {
  id: 'preview-trip',
  owner_id: 'u1',
  name: 'Estate 2027',
  description: 'Due settimane ad agosto, budget medio, niente voli all’alba.',
  cover_image_url: 'scene:0',
  cover_image_attribution: null,
  invite_code: 'K7PQ2MXA',
  created_at: '2026-09-01T10:00:00Z',
}

const MEMBERS: TripMember[] = [
  { id: 'm1', trip_id: TRIP.id, user_id: 'u1', role: 'owner', joined_at: '2026-09-01T10:00:00Z', profile: { display_name: 'Giulia Rossi', avatar_url: null } },
  { id: 'm2', trip_id: TRIP.id, user_id: 'u2', role: 'editor', joined_at: '2026-09-02T10:00:00Z', profile: { display_name: 'Marco Bianchi', avatar_url: null } },
  { id: 'm3', trip_id: TRIP.id, user_id: 'u3', role: 'editor', joined_at: '2026-09-03T10:00:00Z', profile: { display_name: 'Sara Conti', avatar_url: null } },
  { id: 'm4', trip_id: TRIP.id, user_id: 'u4', role: 'viewer', joined_at: '2026-09-04T10:00:00Z', profile: { display_name: 'Luca Ferri', avatar_url: null } },
]

const votes = (types: VoteType[]) => types.map((vote_type, i) => ({ id: `v${Math.random()}`, user_id: `u${i + 1}`, vote_type }))

const base = {
  trip_id: TRIP.id,
  image_url: null,
  image_attribution: null,
  selected_at: null,
  created_by: 'u2',
  comments: [{ count: 2 }],
  creator: MEMBERS[1].profile,
}

const DESTINATIONS: Destination[] = [
  { ...base, id: 'd1', name: 'Lisbona', country: 'Portogallo', lat: 38.72, lng: -9.14, mood: ['culture', 'food_wine', 'nightlife'], budget_level: 2, expectations: 'Tramonti al Miradouro, pastéis de nata e tram che si arrampicano.', status: 'proposed', created_at: '2026-09-05T10:00:00Z', votes: votes(['up', 'up', 'up']) },
  { ...base, id: 'd2', name: 'Isole Lofoten', country: 'Norvegia', lat: 68.2, lng: 13.6, mood: ['nature', 'adventure'], budget_level: 3, expectations: null, status: 'proposed', created_at: '2026-09-06T10:00:00Z', votes: votes(['up', 'down', 'up']) },
  { ...base, id: 'd3', name: 'Oaxaca', country: 'Messico', lat: 17.06, lng: -96.72, mood: ['food_wine', 'culture'], budget_level: 1, expectations: 'Mole, mezcal e mercati.', status: 'proposed', created_at: '2026-09-07T10:00:00Z', votes: votes(['up', 'up']) },
  { ...base, id: 'd4', name: 'Berlino', country: 'Germania', lat: 52.52, lng: 13.4, mood: ['nightlife'], budget_level: 2, expectations: null, status: 'proposed', created_at: '2026-09-08T10:00:00Z', votes: votes(['down']) },
  { ...base, id: 'd5', name: 'Kyoto', country: 'Giappone', lat: 35.01, lng: 135.77, mood: ['culture', 'romantic'], budget_level: 3, expectations: 'Templi, giardini zen e sentieri tra i bambù.', status: 'selected', selected_at: '2026-09-10T18:00:00Z', created_at: '2026-09-02T10:00:00Z', votes: votes(['up', 'up', 'up', 'up']) },
]

const DAYS: ItineraryDay[] = [
  {
    id: 'day1', trip_id: TRIP.id, day_number: 1, date: '2027-08-03', title: 'Arrivo e Gion',
    itinerary_items: [
      { id: 'i1', itinerary_day_id: 'day1', time: '14:00', title: 'Check-in al ryokan', description: 'Vicino a Shijo', order_index: 0 },
      { id: 'i2', itinerary_day_id: 'day1', time: '17:30', title: 'Passeggiata a Gion', description: null, order_index: 1 },
      { id: 'i3', itinerary_day_id: 'day1', time: '20:00', title: 'Cena a Pontocho', description: 'Prenotare!', order_index: 2 },
    ],
  },
  { id: 'day2', trip_id: TRIP.id, day_number: 2, date: '2027-08-04', title: null, itinerary_items: [] },
]

const TABS = { places: DestinationsTab, map: MapTab, roulette: RouletteTab, itinerary: ItineraryTab, group: GroupTab }

export default function PreviewTrip() {
  const { tab = 'places' } = useParams()
  const qc = useQueryClient()
  useState(() => {
    qc.setQueryDefaults(['trip', TRIP.id], { staleTime: Infinity, refetchOnWindowFocus: false })
    qc.setQueryDefaults(['comments'], { staleTime: Infinity, refetchOnWindowFocus: false })
    qc.setQueryData(keys.destinations(TRIP.id), DESTINATIONS)
    qc.setQueryData(keys.itinerary(TRIP.id), DAYS)
    qc.setQueryData(keys.comments('d1'), [
      { id: 'c1', destination_id: 'd1', user_id: 'u3', content: 'Io ci starei una settimana intera!', created_at: '2026-09-09T10:00:00Z', author: MEMBERS[2].profile },
      { id: 'c2', destination_id: 'd1', user_id: 'u1', content: 'Voli ad agosto ancora bassi 👀', created_at: '2026-09-12T10:00:00Z', author: MEMBERS[0].profile },
    ])
    return true
  })

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
