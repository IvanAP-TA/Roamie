import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './supabaseEnv'

export { hasStoredSession, isSupabaseConfigured, rpcErrorCode, type RpcErrorCode } from './supabaseEnv'

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn('[Roamie] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — copy .env.example to .env.local')
}

/**
 * Session tokens are kept in localStorage by supabase-js: a strictly necessary technical
 * storage (no consent banner needed), disclosed in the Privacy Policy.
 */
// Typed with the generated schema: a wrong table, column or RPC name is a compile error, not a runtime one.
export const supabase = createClient<Database>(supabaseUrl ?? 'http://localhost:54321', supabaseAnonKey ?? 'missing-anon-key', {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
