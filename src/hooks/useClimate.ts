import { useQuery } from '@tanstack/react-query'
import { fetchClimate } from '@/lib/climate'

/** Average climate for a place; only fetched when it has coordinates. */
export function useClimate(lat: number | null | undefined, lng: number | null | undefined) {
  return useQuery({
    queryKey: ['climate', lat, lng],
    enabled: lat != null && lng != null,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: ({ signal }) => fetchClimate(lat!, lng!, signal),
  })
}
