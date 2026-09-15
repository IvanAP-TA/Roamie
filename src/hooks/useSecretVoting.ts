import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LiveSpin } from '@/lib/liveSpin'
import { supabase } from '@/lib/supabase'
import { keys, unwrap } from './useTrips'

export const voteProgressKey = (tripId: string) => ['trip', tripId, 'vote-progress'] as const

export interface VoteProgress {
  /** Members who have given at least one point */
  voted: number
  /** Members with no points left */
  done: number
  members: number
}

/**
 * How a secret round is going. Other members' votes can't be read (so no realtime events for them either): the count
 * is refreshed every few seconds instead.
 */
export function useVoteProgress(tripId: string, enabled: boolean) {
  return useQuery({
    queryKey: voteProgressKey(tripId),
    enabled,
    refetchInterval: enabled ? 15_000 : false,
    queryFn: async (): Promise<VoteProgress> =>
      unwrap<VoteProgress[]>(await supabase.rpc('vote_progress', { p_trip_id: tripId }))[0] ?? { voted: 0, done: 0, members: 0 },
  })
}

function useRefreshVoting(tripId: string) {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.trip(tripId) }),
      qc.invalidateQueries({ queryKey: keys.destinations(tripId) }),
      qc.invalidateQueries({ queryKey: voteProgressKey(tripId) }),
    ])
}

/** On: a new secret round. Off: votes visible again, without a reveal. */
export function useSetSecretVoting(tripId: string) {
  const refresh = useRefreshVoting(tripId)
  return useMutation({
    mutationFn: async (secret: boolean) => {
      unwrap(await supabase.rpc('set_secret_voting', { p_trip_id: tripId, p_secret: secret }))
    },
    onSettled: refresh,
  })
}

export function useRevealVotes(tripId: string) {
  const refresh = useRefreshVoting(tripId)
  return useMutation({
    mutationFn: async () => {
      unwrap(await supabase.rpc('reveal_votes', { p_trip_id: tripId }))
    },
    onSettled: refresh,
  })
}

/** The spin just recorded for a trip: the member who started it plays it right away instead of waiting for realtime. */
export async function fetchLatestSpin(tripId: string): Promise<LiveSpin | null> {
  const { data, error } = await supabase
    .from('roulette_spins')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as unknown as LiveSpin | null
}
