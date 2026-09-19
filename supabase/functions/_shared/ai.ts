/**
 * What the AI Edge Functions share: the signed-in user, the answer cache, the daily limits and the Mistral call.
 *
 * Only public facts reach the model (place names, countries, choices made with buttons), never what members wrote,
 * so answers are cached for everyone in public.ai_cache.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

export const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/** The signed-in user (guests included) calling the function, or null. */
export async function callerId(req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await admin.auth.getUser(token)
  return data?.user?.id ?? null
}

export async function cached(key: string): Promise<unknown | null> {
  const { data } = await admin.from('ai_cache').select('result').eq('key', key).maybeSingle()
  return data?.result ?? null
}

export async function store(key: string, result: unknown) {
  await admin.from('ai_cache').upsert({ key, result })
}

export type Kind = 'compare' | 'suggest' | 'itinerary'

/** Takes one of today's slots for a new answer: 'ok', 'user_limit', 'global_limit', or 'failed'. */
export async function claim(user: string, kind: Kind, perUser: number, global: number): Promise<string> {
  const { data, error } = await admin.rpc('claim_ai_request', { p_user: user, p_kind: kind, p_per_user: perUser, p_global: global })
  if (error) {
    console.error('claim_ai_request', error)
    return 'failed'
  }
  return data as string
}

/** Gives the slot back when the model didn't answer, so a failure doesn't cost the user a try. */
export async function release(user: string, kind: Kind) {
  await admin.rpc('release_ai_request', { p_user: user, p_kind: kind })
}

export type Messages = { role: 'system' | 'user'; content: string }[]

/**
 * Free-plan models, tried in order: one the plan doesn't include (403), doesn't know (404) or that is rate limited
 * (429, limits are per model) hands over to the next. Pinned versions: an alias like mistral-small-latest can point to
 * a version with no free quota, and Mistral Large isn't in the free plan at all.
 */
const MODELS = ['ministral-14b-2512', 'ministral-8b-2512', 'ministral-3b-2512']

// The free plan allows about one request per second per model: wait before asking again.
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function ask(key: string, model: string, messages: Messages, schema: object | null, maxTokens: number) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: maxTokens,
      response_format: schema
        ? { type: 'json_schema', json_schema: { name: 'answer', schema, strict: true } }
        : { type: 'json_object' },
    }),
    // A three-week itinerary is a long answer; Edge Functions may run for 150 s.
    signal: AbortSignal.timeout(110_000),
  })
  if (!response.ok) {
    // Mistral's reason (rate limit, plan, schema refused…), never the key.
    console.error('mistral', model, schema ? 'strict' : 'json', response.status, (await response.text()).slice(0, 300))
    return { status: response.status, content: null }
  }
  const data = await response.json()
  return { status: 200, content: (data?.choices?.[0]?.message?.content as string | undefined) ?? null }
}

/**
 * The model's JSON answer following `schema`, trying the models in turn; when structured output is refused (400/422),
 * plain JSON with the schema spelled out in the instructions.
 */
export async function complete(messages: Messages, schema: object, maxTokens = 2000): Promise<{ status: number; content: string | null }> {
  const key = Deno.env.get('MISTRAL_API_KEY')!
  let model = MODELS[0]
  let answer = await ask(key, model, messages, schema, maxTokens)
  for (const next of MODELS.slice(1)) {
    if (![403, 404, 429].includes(answer.status)) break
    model = next
    await pause(1200)
    answer = await ask(key, model, messages, schema, maxTokens)
  }
  if (answer.status === 400 || answer.status === 422) {
    const shaped: Messages = [
      { ...messages[0], content: `${messages[0].content}\nThe JSON must follow this JSON Schema:\n${JSON.stringify(schema)}` },
      ...messages.slice(1),
    ]
    await pause(1200)
    answer = await ask(key, model, shaped, null, maxTokens)
  }
  return answer
}

export const configured = () => Boolean(Deno.env.get('MISTRAL_API_KEY'))

/**
 * The common flow: cached answer, else a slot from the daily limits, the model's answer, checked by `parse`, cached.
 * Replies { result, cached } or { error }: user_limit, global_limit, busy, not_configured, failed.
 */
export async function answer<T>(options: {
  user: string
  kind: Kind
  cacheKey: string
  perUser: number
  global: number
  messages: Messages
  schema: object
  maxTokens?: number
  parse: (raw: string) => T | null
}): Promise<Response> {
  const hit = await cached(options.cacheKey)
  if (hit) return reply({ result: hit, cached: true })
  if (!configured()) return reply({ error: 'not_configured' }, 503)

  const slot = await claim(options.user, options.kind, options.perUser, options.global)
  if (slot === 'failed') return reply({ error: 'failed' }, 500)
  if (slot !== 'ok') return reply({ error: slot }, 429)

  try {
    const { status, content } = await complete(options.messages, options.schema, options.maxTokens)
    if (status === 429) {
      await release(options.user, options.kind)
      return reply({ error: 'busy' }, 503)
    }
    const result = content ? options.parse(content) : null
    if (!result) {
      console.error('unusable answer', options.kind, status, content?.slice(0, 500))
      await release(options.user, options.kind)
      return reply({ error: 'failed' }, 502)
    }
    await store(options.cacheKey, result)
    return reply({ result, cached: false })
  } catch (error) {
    console.error(options.kind, error)
    await release(options.user, options.kind)
    return reply({ error: 'failed' }, 502)
  }
}

/** Parses the model's text as JSON, tolerating a Markdown fence around it. */
export function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ''))
  } catch {
    return null
  }
}
