/**
 * Supabase settings and session hints that don't need the client itself. Public pages import only this
 * module, so signed-out visitors never download supabase-js (see useAuth).
 */

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * Synchronous hint that a session may exist (supabase-js stores it in localStorage under this key),
 * so public pages render straight away for signed-out visitors instead of waiting on getSession().
 */
export function hasStoredSession(): boolean {
  if (!supabaseUrl || typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(`sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`) !== null
  } catch {
    return false
  }
}

/** This page load has to talk to Supabase Auth: a stored session, or the return from Google's sign-in. */
export function needsAuthCheck(): boolean {
  if (typeof window === 'undefined') return false
  return hasStoredSession() || window.location.pathname.startsWith('/auth/callback')
}

/** Postgres error messages raised by our RPCs (see supabase/migrations/*_functions.sql). */
export type RpcErrorCode =
  | 'not_authenticated'
  | 'invalid_invite_code'
  | 'forbidden'
  | 'no_eligible_destinations'
  | 'invalid_points'
  | 'points_budget_exceeded'
  | 'destination_not_proposed'

export function rpcErrorCode(error: { message?: string } | null | undefined): RpcErrorCode | null {
  const known: RpcErrorCode[] = [
    'not_authenticated',
    'invalid_invite_code',
    'forbidden',
    'no_eligible_destinations',
    'invalid_points',
    'points_budget_exceeded',
    'destination_not_proposed',
  ]
  return known.find((code) => error?.message?.includes(code)) ?? null
}
