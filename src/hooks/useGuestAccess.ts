import { useQuery } from '@tanstack/react-query'
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabaseEnv'

/**
 * Whether guests can join without an account: the project's public auth settings say if anonymous sign-ins are on,
 * so the option only appears once they're enabled in the Supabase dashboard.
 */
export function useGuestAccess() {
  return useQuery({
    queryKey: ['auth-settings', 'anonymous'],
    enabled: isSupabaseConfigured,
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const response = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseAnonKey! } })
      if (!response.ok) return false
      const settings = (await response.json()) as { external?: { anonymous_users?: boolean } }
      return settings.external?.anonymous_users === true
    },
  })
}
