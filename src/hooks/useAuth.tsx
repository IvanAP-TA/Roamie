import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { clearOfflineCache } from '@/lib/offline'
import { isSupabaseConfigured, needsAuthCheck, readStoredSession } from '@/lib/supabaseEnv'
import { safeNextPath } from '@/lib/utils'
import type { Profile } from '@/lib/types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signInWithGoogle: (next?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** supabase-js is loaded on demand: public pages don't download it for signed-out visitors. */
const loadSupabase = () => import('@/lib/supabase').then((module) => module.supabase)

const CACHE_OWNER_KEY = 'roamie.cacheOwner'

/**
 * Offline, an expired access token can't be refreshed and supabase-js reports no session. The saved one
 * keeps the trips on this device readable; supabase-js refreshes it once the connection is back.
 */
const withOfflineFallback = (session: Session | null) =>
  session ?? (typeof navigator !== 'undefined' && !navigator.onLine ? readStoredSession<Session>() : null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  // No stored session and not coming back from Google: signed out, nothing to wait for.
  const [loading, setLoading] = useState(() => isSupabaseConfigured && needsAuthCheck())

  useEffect(() => {
    if (!isSupabaseConfigured || !needsAuthCheck()) return
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    loadSupabase().then(
      (supabase) => {
        if (cancelled) return
        // getSession() also completes the PKCE code exchange when returning from Google.
        void supabase.auth.getSession().then(({ data }) => {
          if (cancelled) return
          setSession(withOfflineFallback(data.session))
          setLoading(false)
        })
        const { data } = supabase.auth.onAuthStateChange((event, next) => {
          setSession(event === 'SIGNED_OUT' ? null : withOfflineFallback(next))
          setLoading(false)
        })
        unsubscribe = () => data.subscription.unsubscribe()
      },
      () => !cancelled && setLoading(false),
    )

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  const userId = session?.user.id

  // Another account on this device: the saved trips belong to someone else.
  useEffect(() => {
    if (!userId) return
    try {
      const owner = localStorage.getItem(CACHE_OWNER_KEY)
      if (owner && owner !== userId) {
        queryClient.clear()
        void clearOfflineCache()
      }
      localStorage.setItem(CACHE_OWNER_KEY, userId)
    } catch {
      // Storage blocked: nothing was saved either.
    }
  }, [userId, queryClient])

  const { data: profile = null } = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const supabase = await loadSupabase()
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).single()
      if (error) throw error
      return data as Profile
    },
  })

  const signInWithGoogle = useCallback(async (next?: string) => {
    const supabase = await loadSupabase()
    // Always come back to the current origin: the PKCE code verifier lives in this origin's localStorage.
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath(next))}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, queryParams: { prompt: 'select_account' } },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const supabase = await loadSupabase()
    await supabase.auth.signOut()
    queryClient.clear()
    await clearOfflineCache()
    try {
      localStorage.removeItem(CACHE_OWNER_KEY)
    } catch {
      // Storage blocked: nothing to remove.
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, profile, loading, signInWithGoogle, signOut }),
    [session, profile, loading, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
