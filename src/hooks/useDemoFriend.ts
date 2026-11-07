import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useTripContext } from '@/hooks/useTripContext'
import { keys, unwrap } from '@/hooks/useTrips'
import { supabase } from '@/lib/supabase'

/** The three demo friends of the sample trip (supabase/migrations/20261107120000_sample_friends.sql): accounts nobody can sign in with. */
export const DEMO_FRIENDS = {
  marco: 'd0000000-0000-4000-8000-000000000001',
  sara: 'd0000000-0000-4000-8000-000000000002',
  luca: 'd0000000-0000-4000-8000-000000000003',
}
const VOTE_DELAY_MS = 3000

/** The people of the sample trip who aren't real: shown as "demo", and left out of every count of real groups. */
export const isDemoFriend = (userId: string | undefined) => Object.values(DEMO_FRIENDS).includes(userId ?? '')

/**
 * "Invite a friend (demo)": the third friend comes in and, a few seconds later, votes, so whoever is trying the sample
 * trip alone sees what a group voting looks like. Only on sample trips, and only once.
 */
export function useBringInFriend() {
  const { t } = useTranslation()
  const { trip, members, isOwner } = useTripContext()
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const arrived = members.some((m) => m.user_id === DEMO_FRIENDS.luca)

  const refresh = useCallback(
    () => Promise.all([qc.invalidateQueries({ queryKey: keys.members(trip.id) }), qc.invalidateQueries({ queryKey: keys.destinations(trip.id) })]),
    [qc, trip.id],
  )

  const bringIn = useCallback(async () => {
    if (busy || arrived) return
    setBusy(true)
    try {
      unwrap(await supabase.rpc('demo_friend_joins', { p_trip_id: trip.id }))
      await refresh()
      toast(t('sample.friendJoined'))
      await new Promise((resolve) => setTimeout(resolve, VOTE_DELAY_MS))
      unwrap(await supabase.rpc('demo_friend_votes', { p_trip_id: trip.id }))
      await refresh()
      toast(t('sample.friendVoted'))
    } catch {
      toast.error(t('errors.generic'))
    } finally {
      setBusy(false)
    }
  }, [busy, arrived, trip.id, refresh, t])

  return { available: Boolean(trip.is_sample) && isOwner, arrived, busy, bringIn }
}
