import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProfileSummary } from '@/lib/types'
import { keys, unwrap } from './useTrips'

export type TripEventKind =
  | 'joined'
  | 'proposed'
  | 'chosen'
  | 'visited'
  | 'commented'
  | 'reason'
  | 'voted'
  | 'revealed'
  | 'itinerary'
  | 'availability'
  | 'dates_set'

export interface TripEvent {
  id: number
  trip_id: string
  actor_id: string | null
  kind: TripEventKind
  destination_id: string | null
  data: { name?: string; text?: string; count?: number; start?: string; end?: string }
  created_at: string
  actor: ProfileSummary | null
}

/** The latest things that happened in a trip (see supabase/migrations/*_trip_events.sql), newest first. */
export function useTripEvents(tripId: string) {
  return useQuery({
    queryKey: keys.events(tripId),
    queryFn: async () =>
      unwrap<TripEvent[]>(
        await supabase
          .from('trip_events')
          .select('*, actor:profiles(display_name, avatar_url)')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false })
          .limit(60),
      ),
  })
}

/**
 * Events can be dated a few seconds ahead (the wheel's result waits for the spin to end): they show up only once
 * their time comes, so the feed never spoils a live spin.
 */
export function useDueEvents(events: TripEvent[] | undefined): TripEvent[] {
  const [now, setNow] = useState(() => Date.now())
  const next = events?.map((e) => Date.parse(e.created_at)).filter((t) => t > now).sort((a, b) => a - b)[0]
  useEffect(() => {
    if (!next) return
    const timer = setTimeout(() => setNow(Date.now()), next - Date.now() + 50)
    return () => clearTimeout(timer)
  }, [next])
  return (events ?? []).filter((e) => Date.parse(e.created_at) <= now)
}

const seenKey = (tripId: string) => `roamie.feed.seen.${tripId}`

/**
 * When the user last opened this trip, on this device: what happened since then is "new". Read once per visit and
 * moved to now, so the highlight lasts for the whole visit and is gone on the next one.
 */
export function useLastVisit(tripId: string): number | null {
  const [previous] = useState<number | null>(() => {
    try {
      const value = Number(localStorage.getItem(seenKey(tripId)))
      return Number.isFinite(value) && value > 0 ? value : null
    } catch {
      return null
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(seenKey(tripId), String(Date.now()))
    } catch {
      // Storage blocked: every event just looks already seen.
    }
  }, [tripId])
  return previous
}
