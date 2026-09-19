import { useQuery } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { useTranslation } from 'react-i18next'
import type { Comparison, CompareInput, Lang } from '../../supabase/functions/compare-destinations/compare.ts'
import { useTripContext } from '@/hooks/useTripContext'
import { useOrigin } from '@/lib/origin'
import { supabase } from '@/lib/supabase'
import type { Destination, Trip } from '@/lib/types'

export type { Comparison }
export { ASPECTS, type Aspect } from '../../supabase/functions/compare-destinations/compare.ts'

export class AiCompareError extends Error {}

/** The month and length the group is looking at: final dates first, else the period they are considering. */
function tripTiming(trip: Trip): { month: number | null; days: number | null } {
  const start = trip.start_date ?? trip.date_window_start
  const month = start ? Number(start.slice(5, 7)) : null
  const span = trip.start_date && trip.end_date ? Math.round((Date.parse(trip.end_date) - Date.parse(trip.start_date)) / 86_400_000) + 1 : null
  return { month, days: span ?? trip.trip_length }
}

/** An AI comparison of the places, fetched only once `enabled` (the user asked for it). */
export function useAiComparison(destinations: Destination[], enabled: boolean) {
  const { i18n } = useTranslation()
  const { trip, members } = useTripContext()
  const [origin] = useOrigin()
  const lang = (['it', 'en', 'es'].includes(i18n.resolvedLanguage ?? '') ? i18n.resolvedLanguage : 'en') as Lang
  const input: CompareInput = {
    places: destinations.map((d) => ({ name: d.name, country: d.country })),
    lang,
    ...tripTiming(trip),
    travellers: members.length,
    origin,
  }

  return useQuery({
    queryKey: ['ai-compare', input],
    enabled,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ comparison: Comparison }>('compare-destinations', { body: input })
      if (error) {
        const body = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null
        throw new AiCompareError((body as { error?: string } | null)?.error ?? 'failed')
      }
      if (!data?.comparison) throw new AiCompareError('failed')
      return data.comparison
    },
  })
}
