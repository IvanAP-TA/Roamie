import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys, unwrap } from './useTrips'
import type { ItineraryDay, ItineraryItem } from '@/lib/types'

const DAY_SELECT =
  'id, trip_id, day_number, date, title, itinerary_items(id, itinerary_day_id, time, title, description, order_index, place_name, lat, lng)'

const sortDays = (days: ItineraryDay[]) =>
  [...days]
    .sort((a, b) => a.day_number - b.day_number)
    .map((d) => ({ ...d, itinerary_items: [...d.itinerary_items].sort((a, b) => a.order_index - b.order_index) }))

export function useItinerary(tripId: string) {
  return useQuery({
    queryKey: keys.itinerary(tripId),
    queryFn: async () =>
      sortDays(unwrap<ItineraryDay[]>(await supabase.from('itinerary_days').select(DAY_SELECT).eq('trip_id', tripId))),
  })
}

export interface DayInput {
  date: string | null
  title: string | null
}

export interface ItemInput {
  time: string | null
  title: string
  description: string | null
  place_name: string | null
  lat: number | null
  lng: number | null
}

export function useItineraryMutations(tripId: string) {
  const qc = useQueryClient()
  const key = keys.itinerary(tripId)
  const days = () => qc.getQueryData<ItineraryDay[]>(key) ?? []
  const setDays = (updater: (days: ItineraryDay[]) => ItineraryDay[]) =>
    qc.setQueryData<ItineraryDay[]>(key, (prev) => sortDays(updater(prev ?? [])))
  const refresh = () => qc.invalidateQueries({ queryKey: key })

  const addDay = useMutation({
    mutationFn: async (input: DayInput) => {
      const dayNumber = Math.max(0, ...days().map((d) => d.day_number)) + 1
      return unwrap<ItineraryDay>(
        await supabase.from('itinerary_days').insert({ trip_id: tripId, day_number: dayNumber, ...input }).select(DAY_SELECT).single(),
      )
    },
    onSuccess: (day) => setDays((list) => (list.some((d) => d.id === day.id) ? list : [...list, day])),
  })

  const updateDay = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: DayInput }) => {
      unwrap(await supabase.from('itinerary_days').update(input).eq('id', id))
    },
    onMutate: ({ id, input }) => setDays((list) => list.map((d) => (d.id === id ? { ...d, ...input } : d))),
    onSettled: refresh,
  })

  /** Deletes a day and renumbers the following ones so the sequence stays 1..n. */
  const deleteDay = useMutation({
    mutationFn: async (id: string) => {
      const target = days().find((d) => d.id === id)
      unwrap(await supabase.from('itinerary_days').delete().eq('id', id))
      if (!target) return
      const later = days().filter((d) => d.day_number > target.day_number)
      for (const d of later) {
        unwrap(await supabase.from('itinerary_days').update({ day_number: d.day_number - 1 }).eq('id', d.id))
      }
    },
    onSuccess: refresh,
  })

  const addItem = useMutation({
    mutationFn: async ({ dayId, input }: { dayId: string; input: ItemInput }) => {
      const items = days().find((d) => d.id === dayId)?.itinerary_items ?? []
      const orderIndex = Math.max(-1, ...items.map((i) => i.order_index)) + 1
      return unwrap<ItineraryItem>(
        await supabase
          .from('itinerary_items')
          .insert({ itinerary_day_id: dayId, order_index: orderIndex, ...input })
          .select()
          .single(),
      )
    },
    onSuccess: (item) =>
      setDays((list) =>
        list.map((d) =>
          d.id === item.itinerary_day_id && !d.itinerary_items.some((i) => i.id === item.id)
            ? { ...d, itinerary_items: [...d.itinerary_items, item] }
            : d,
        ),
      ),
  })

  const updateItem = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ItemInput }) => {
      unwrap(await supabase.from('itinerary_items').update(input).eq('id', id))
    },
    onMutate: ({ id, input }) =>
      setDays((list) => list.map((d) => ({ ...d, itinerary_items: d.itinerary_items.map((i) => (i.id === id ? { ...i, ...input } : i)) }))),
    onSettled: refresh,
  })

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('itinerary_items').delete().eq('id', id))
    },
    onMutate: (id) => setDays((list) => list.map((d) => ({ ...d, itinerary_items: d.itinerary_items.filter((i) => i.id !== id) }))),
    onSettled: refresh,
  })

  /** Optimistic drag-and-drop reorder: rewrite order_index only for items whose position changed. */
  const reorderItems = useMutation({
    mutationFn: async ({ orderedIds, previous }: { dayId: string; orderedIds: string[]; previous: ItineraryItem[] }) => {
      const changed = orderedIds
        .map((id, index) => ({ id, index }))
        .filter(({ id, index }) => previous.find((i) => i.id === id)?.order_index !== index)
      const results = await Promise.all(
        changed.map(({ id, index }) => supabase.from('itinerary_items').update({ order_index: index }).eq('id', id)),
      )
      results.forEach((r) => unwrap(r))
    },
    onMutate: ({ dayId, orderedIds }) =>
      setDays((list) =>
        list.map((d) =>
          d.id === dayId
            ? {
                ...d,
                itinerary_items: orderedIds.map((id, index) => ({ ...d.itinerary_items.find((i) => i.id === id)!, order_index: index })),
              }
            : d,
        ),
      ),
    onError: refresh,
    onSettled: refresh,
  })

  return { addDay, updateDay, deleteDay, addItem, updateItem, deleteItem, reorderItems }
}
