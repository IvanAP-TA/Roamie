import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn('[Roamie] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — copy .env.example to .env.local')
}

/**
 * Session tokens are kept in localStorage by supabase-js: a strictly necessary technical
 * storage (no consent banner needed), disclosed in the Privacy Policy.
 */
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-anon-key', {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/**
 * Synchronous hint that a session may exist (supabase-js stores it in localStorage under this key),
 * so public pages render straight away for signed-out visitors instead of waiting on getSession().
 */
export function hasStoredSession(): boolean {
  if (!url || typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(`sb-${new URL(url).hostname.split('.')[0]}-auth-token`) !== null
  } catch {
    return false
  }
}

/** Postgres error messages raised by our RPCs (see supabase/migrations/*_functions.sql). */
export type RpcErrorCode =
  | 'not_authenticated'
  | 'invalid_invite_code'
  | 'forbidden'
  | 'no_eligible_destinations'
  | 'invalid_vote_type'

export function rpcErrorCode(error: { message?: string } | null | undefined): RpcErrorCode | null {
  const known: RpcErrorCode[] = [
    'not_authenticated',
    'invalid_invite_code',
    'forbidden',
    'no_eligible_destinations',
    'invalid_vote_type',
  ]
  return known.find((code) => error?.message?.includes(code)) ?? null
}
