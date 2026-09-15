import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { announceSpin, type LiveSpin } from '@/lib/liveSpin'
import { supabase } from '@/lib/supabase'
import { voteProgressKey } from './useSecretVoting'
import { keys } from './useTrips'
import type { ChecklistItem, Destination, DestinationComment, ItineraryDay, TripLink, TripMember } from '@/lib/types'

type Row = Record<string, unknown> & { id?: string }
type Payload = RealtimePostgresChangesPayload<Row>

/**
 * One Supabase Realtime channel per open trip. Postgres changes respect RLS, so members only
 * receive rows they may read. DELETE payloads carry only the primary key (and can't be filtered),
 * so relevance is checked against what's already in the query cache. Bursts are debounced.
 */
export function useTripRealtime(tripId: string | undefined) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!tripId) return

    const timers = new Map<string, ReturnType<typeof setTimeout>>()
    const invalidate = (queryKey: readonly unknown[]) => {
      const id = JSON.stringify(queryKey)
      clearTimeout(timers.get(id))
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id)
          void qc.invalidateQueries({ queryKey })
        }, 150),
      )
    }

    const destinations = () => qc.getQueryData<Destination[]>(keys.destinations(tripId)) ?? []
    const itinerary = () => qc.getQueryData<ItineraryDay[]>(keys.itinerary(tripId)) ?? []
    const members = () => qc.getQueryData<TripMember[]>(keys.members(tripId)) ?? []
    const links = () => qc.getQueryData<TripLink[]>(keys.links(tripId)) ?? []
    const checklist = () => qc.getQueryData<ChecklistItem[]>(keys.checklist(tripId)) ?? []
    const rowOf = (p: Payload): Row => (p.eventType === 'DELETE' ? p.old : p.new) as Row

    const channel = supabase
      .channel(`trip:${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` }, () => {
        invalidate(keys.trip(tripId))
        // A secret round started or was revealed: which votes this member may read has changed.
        invalidate(keys.destinations(tripId))
        invalidate(voteProgressKey(tripId))
      })
      // Every spin, by hand or scheduled: the live wheel plays it for everyone with the trip open.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'roulette_spins', filter: `trip_id=eq.${tripId}` }, (p: Payload) =>
        announceSpin(p.new as unknown as LiveSpin),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_members' }, (p: Payload) => {
        const row = rowOf(p)
        if (row.trip_id === tripId || members().some((m) => m.id === row.id)) {
          invalidate(keys.members(tripId))
          invalidate(keys.trips)
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'destinations' }, (p: Payload) => {
        const row = rowOf(p)
        const cached = destinations().find((d) => d.id === row.id)
        if (row.trip_id !== tripId && !cached) return
        invalidate(keys.destinations(tripId))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, (p: Payload) => {
        const row = rowOf(p)
        const list = destinations()
        const relevant =
          list.some((d) => d.id === row.destination_id) || list.some((d) => d.votes.some((v) => v.id === row.id))
        if (relevant) invalidate(keys.destinations(tripId))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'destination_reviews' }, (p: Payload) => {
        const row = rowOf(p)
        const list = destinations()
        if (list.some((d) => d.id === row.destination_id) || list.some((d) => d.reviews?.some((r) => r.id === row.id))) {
          invalidate(keys.destinations(tripId))
          invalidate(['passport'])
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (p: Payload) => {
        const row = rowOf(p)
        if (typeof row.destination_id === 'string' && destinations().some((d) => d.id === row.destination_id)) {
          invalidate(keys.comments(row.destination_id))
          invalidate(keys.destinations(tripId))
          return
        }
        for (const [queryKey, list] of qc.getQueriesData<DestinationComment[]>({ queryKey: ['comments'] })) {
          if (list?.some((c) => c.id === row.id)) {
            invalidate(queryKey)
            invalidate(keys.destinations(tripId))
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itinerary_days' }, (p: Payload) => {
        const row = rowOf(p)
        if (row.trip_id === tripId || itinerary().some((d) => d.id === row.id)) invalidate(keys.itinerary(tripId))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itinerary_items' }, (p: Payload) => {
        const row = rowOf(p)
        const days = itinerary()
        if (days.some((d) => d.id === row.itinerary_day_id || d.itinerary_items.some((i) => i.id === row.id))) {
          invalidate(keys.itinerary(tripId))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_links' }, (p: Payload) => {
        const row = rowOf(p)
        if (row.trip_id === tripId || links().some((l) => l.id === row.id)) invalidate(keys.links(tripId))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability' }, (p: Payload) => {
        // trip_id is part of the primary key, so DELETE payloads carry it too.
        if (rowOf(p).trip_id === tripId) invalidate(keys.availability(tripId))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_items' }, (p: Payload) => {
        const row = rowOf(p)
        if (row.trip_id === tripId || checklist().some((i) => i.id === row.id)) invalidate(keys.checklist(tripId))
      })
      .subscribe()

    return () => {
      timers.forEach(clearTimeout)
      void supabase.removeChannel(channel)
    }
  }, [tripId, qc])
}
