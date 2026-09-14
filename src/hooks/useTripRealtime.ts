import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { toast } from 'sonner'
import i18n from '@/i18n'
import { supabase } from '@/lib/supabase'
import { isLocalSpin } from '@/lib/roulette'
import { keys } from './useTrips'
import type { Destination, DestinationComment, ItineraryDay, TripMember } from '@/lib/types'

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
    const rowOf = (p: Payload): Row => (p.eventType === 'DELETE' ? p.old : p.new) as Row

    const channel = supabase
      .channel(`trip:${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` }, () =>
        invalidate(keys.trip(tripId)),
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
        if (p.eventType === 'UPDATE' && row.status === 'selected' && cached?.status === 'proposed' && !isLocalSpin(String(row.id))) {
          toast(i18n.t('roulette.remoteResult', { name: String(row.name) }), { icon: '🎡' })
        }
        invalidate(keys.destinations(tripId))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, (p: Payload) => {
        const row = rowOf(p)
        const list = destinations()
        const relevant =
          list.some((d) => d.id === row.destination_id) || list.some((d) => d.votes.some((v) => v.id === row.id))
        if (relevant) invalidate(keys.destinations(tripId))
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
      .subscribe()

    return () => {
      timers.forEach(clearTimeout)
      void supabase.removeChannel(channel)
    }
  }, [tripId, qc])
}
