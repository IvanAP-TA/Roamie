import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Destination, ReasonSummary } from '@/lib/types'
import { useAuth } from './useAuth'
import { keys, unwrap } from './useTrips'

/** Reasons live inside the destinations list, so every change updates that one cache. */
function useReasonsCache(tripId: string) {
  const qc = useQueryClient()
  const key = keys.destinations(tripId)
  const update = (change: (reasons: ReasonSummary[]) => ReasonSummary[]) =>
    qc.setQueryData<Destination[]>(key, (list) => list?.map((d) => ({ ...d, reasons: change(d.reasons ?? []) })))
  const snapshot = async () => {
    await qc.cancelQueries({ queryKey: key })
    return qc.getQueryData<Destination[]>(key)
  }
  const restore = (previous: Destination[] | undefined) => qc.setQueryData(key, previous)
  const refresh = () => qc.invalidateQueries({ queryKey: key })
  return { update, snapshot, restore, refresh }
}

export function useAddReason(tripId: string, destinationId: string) {
  const cache = useReasonsCache(tripId)
  return useMutation({
    mutationFn: async (text: string) =>
      unwrap<{ id: string }>(await supabase.from('destination_reasons').insert({ destination_id: destinationId, text }).select('id').single()),
    onSettled: () => cache.refresh(),
  })
}

export function useDeleteReason(tripId: string) {
  const cache = useReasonsCache(tripId)
  return useMutation({
    mutationFn: async (id: string) => {
      const rows = unwrap<{ id: string }[]>(await supabase.from('destination_reasons').delete().eq('id', id).select('id'))
      if (rows.length === 0) throw new Error('forbidden')
    },
    onMutate: async (id) => {
      const previous = await cache.snapshot()
      cache.update((reasons) => reasons.filter((r) => r.id !== id))
      return { previous }
    },
    onError: (_error, _id, context) => cache.restore(context?.previous),
    onSettled: () => cache.refresh(),
  })
}

export function useToggleReasonLike(tripId: string) {
  const { user } = useAuth()
  const cache = useReasonsCache(tripId)
  return useMutation({
    mutationFn: async ({ reasonId, liked }: { reasonId: string; liked: boolean }) => {
      if (liked) {
        unwrap(await supabase.from('reason_likes').delete().eq('reason_id', reasonId).eq('user_id', user!.id).select('id'))
      } else {
        unwrap(await supabase.from('reason_likes').insert({ reason_id: reasonId }).select('id').single())
      }
    },
    onMutate: async ({ reasonId, liked }) => {
      const previous = await cache.snapshot()
      cache.update((reasons) =>
        reasons.map((r) =>
          r.id !== reasonId || !user
            ? r
            : {
                ...r,
                likes: liked ? r.likes.filter((l) => l.user_id !== user.id) : [...r.likes, { id: `optimistic-${reasonId}`, user_id: user.id }],
              },
        ),
      )
      return { previous }
    },
    onError: (_error, _vars, context) => cache.restore(context?.previous),
    onSettled: () => cache.refresh(),
  })
}
