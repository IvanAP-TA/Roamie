import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys, unwrap } from './useTrips'
import type { ChecklistItem, ChecklistKind, LinkCategory, TripLink } from '@/lib/types'

// ─── Useful links ───────────────────────────────────────────────────────────
export function useTripLinks(tripId: string) {
  return useQuery({
    queryKey: keys.links(tripId),
    queryFn: async () =>
      unwrap<TripLink[]>(await supabase.from('trip_links').select('*').eq('trip_id', tripId).order('created_at')),
  })
}

export interface LinkInput {
  category: LinkCategory
  title: string
  url: string | null
  note: string | null
}

export function useLinkMutations(tripId: string) {
  const qc = useQueryClient()
  const key = keys.links(tripId)
  const refresh = () => qc.invalidateQueries({ queryKey: key })

  const add = useMutation({
    mutationFn: async (input: LinkInput) =>
      unwrap<TripLink>(await supabase.from('trip_links').insert({ ...input, trip_id: tripId }).select().single()),
    onSuccess: (link) => qc.setQueryData<TripLink[]>(key, (list) => (list && !list.some((l) => l.id === link.id) ? [...list, link] : list)),
  })

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: LinkInput }) => {
      unwrap(await supabase.from('trip_links').update(input).eq('id', id))
    },
    onMutate: ({ id, input }) => qc.setQueryData<TripLink[]>(key, (list) => list?.map((l) => (l.id === id ? { ...l, ...input } : l))),
    onSettled: refresh,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('trip_links').delete().eq('id', id))
    },
    onMutate: (id) => qc.setQueryData<TripLink[]>(key, (list) => list?.filter((l) => l.id !== id)),
    onSettled: refresh,
  })

  return { add, update, remove }
}

// ─── Checklist ──────────────────────────────────────────────────────────────
export function useChecklist(tripId: string) {
  return useQuery({
    queryKey: keys.checklist(tripId),
    queryFn: async () =>
      unwrap<ChecklistItem[]>(await supabase.from('checklist_items').select('*').eq('trip_id', tripId).order('created_at')),
  })
}

export type ChecklistPatch = Partial<Pick<ChecklistItem, 'kind' | 'title' | 'assignee_id' | 'done'>>

export function useChecklistMutations(tripId: string) {
  const qc = useQueryClient()
  const key = keys.checklist(tripId)
  const refresh = () => qc.invalidateQueries({ queryKey: key })

  const add = useMutation({
    mutationFn: async (input: { kind: ChecklistKind; title: string; assignee_id: string | null }) =>
      unwrap<ChecklistItem>(await supabase.from('checklist_items').insert({ ...input, trip_id: tripId }).select().single()),
    onSuccess: (item) =>
      qc.setQueryData<ChecklistItem[]>(key, (list) => (list && !list.some((i) => i.id === item.id) ? [...list, item] : list)),
  })

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ChecklistPatch }) => {
      unwrap(await supabase.from('checklist_items').update(patch).eq('id', id))
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<ChecklistItem[]>(key)
      qc.setQueryData<ChecklistItem[]>(key, (list) => list?.map((i) => (i.id === id ? { ...i, ...patch } : i)))
      return { previous }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: refresh,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('checklist_items').delete().eq('id', id))
    },
    onMutate: (id) => qc.setQueryData<ChecklistItem[]>(key, (list) => list?.filter((i) => i.id !== id)),
    onSettled: refresh,
  })

  return { add, update, remove }
}
