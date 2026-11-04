import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { unwrap } from '@/hooks/useTrips'
import { supabase } from '@/lib/supabase'

const KEY = 'roamie.homeCity'

function readLocal(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/**
 * The city the user usually leaves from, for the flight buttons: in their private profile (profile_private) when
 * signed in, on this device otherwise (the public guides). Asked once, the first time it's needed.
 */
export function useHomeCity(): [string | null, (city: string) => void] {
  const { user } = useAuth()
  const qc = useQueryClient()
  const key = ['home-city', user?.id] as const
  // Read after the first render: the guide pages are prerendered, and the server has no saved city.
  const [local, setLocal] = useState<string | null>(null)
  useEffect(() => setLocal(readLocal()), [])
  const { data: saved } = useQuery({
    queryKey: key,
    enabled: Boolean(user),
    staleTime: Infinity,
    queryFn: async () =>
      unwrap<{ home_city: string | null } | null>(await supabase.from('profile_private').select('home_city').eq('user_id', user!.id).maybeSingle())?.home_city ??
      null,
  })
  const { mutate } = useMutation({
    mutationFn: async (city: string) => {
      unwrap(await supabase.from('profile_private').upsert({ user_id: user!.id, home_city: city, updated_at: new Date().toISOString() }))
    },
  })

  const set = useCallback(
    (value: string) => {
      const city = value.trim().slice(0, 80)
      if (!city) return
      try {
        localStorage.setItem(KEY, city)
      } catch {
        // Storage blocked: kept for this visit only.
      }
      setLocal(city)
      if (user) {
        qc.setQueryData(['home-city', user.id], city)
        mutate(city)
      }
    },
    [user, qc, mutate],
  )

  return [saved ?? local, set]
}
