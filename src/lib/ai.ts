import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/** Why an AI function gave no answer: user_limit, global_limit, busy, not_configured, unauthorized or failed. */
export class AiError extends Error {}

export const AI_ERRORS = ['user_limit', 'global_limit', 'busy', 'not_configured', 'unauthorized'] as const

/** Calls one of the AI Edge Functions (supabase/functions/_shared/ai.ts) and returns its answer. */
export async function invokeAi<T>(fn: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke<{ result: T }>(fn, { body })
  if (error) {
    const reply = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null
    throw new AiError((reply as { error?: string } | null)?.error ?? 'failed')
  }
  if (!data?.result) throw new AiError('failed')
  return data.result
}

/** The error's code for a message, among those the UI explains; anything else is 'failed'. */
export const aiErrorCode = (error: unknown): (typeof AI_ERRORS)[number] | 'failed' => {
  const code = error instanceof AiError ? error.message : 'failed'
  return (AI_ERRORS as readonly string[]).includes(code) ? (code as (typeof AI_ERRORS)[number]) : 'failed'
}
