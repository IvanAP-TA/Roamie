/**
 * compare-destinations: an AI comparison of 2–3 places (Mistral), for the compare sheet.
 *
 * Signed-in users only (guests included). Answers are cached for everyone (see compare.ts: only public facts go in),
 * and each new answer counts toward a daily limit per user and a global one that protects the free Mistral quota.
 * Replies { comparison, cached } or { error } with one of: unauthorized, bad_request, user_limit, global_limit,
 * busy, not_configured, failed.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildMessages, cacheKey, parseComparison, readInput, responseSchema } from './compare.ts'

// Pinned versions: aliases like mistral-small-latest can point to a version the free plan gives no quota for.
// The second model is tried when the first is rate limited (limits are per model).
const MODELS = ['mistral-large-2512', 'ministral-14b-2512']
const PER_USER_PER_DAY = 15
const GLOBAL_PER_DAY = 400
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

async function askMistral(key: string, model: string, messages: ReturnType<typeof buildMessages>, strict: boolean) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 2000,
      response_format: strict
        ? { type: 'json_schema', json_schema: { name: 'comparison', schema: responseSchema, strict: true } }
        : { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!response.ok) {
    // Mistral's reason (rate limit, capacity, schema refused…), never the key.
    console.error('mistral', model, strict ? 'strict' : 'json', response.status, (await response.text()).slice(0, 300))
    return { status: response.status, content: null }
  }
  const data = await response.json()
  return { status: 200, content: (data?.choices?.[0]?.message?.content as string | undefined) ?? null }
}

// The free plan allows about one request per second: wait before asking again.
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return reply({ error: 'bad_request' }, 405)

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } }
  const user = auth?.user
  if (!user) return reply({ error: 'unauthorized' }, 401)

  const input = readInput(await req.json().catch(() => null))
  if (!input) return reply({ error: 'bad_request' }, 400)

  const key = cacheKey(input)
  const { data: hit } = await admin.from('ai_comparisons').select('result').eq('key', key).maybeSingle()
  if (hit) return reply({ comparison: hit.result, cached: true })

  const apiKey = Deno.env.get('MISTRAL_API_KEY')
  if (!apiKey) return reply({ error: 'not_configured' }, 503)

  const { data: claim, error: claimError } = await admin.rpc('claim_ai_request', {
    p_user: user.id,
    p_per_user: PER_USER_PER_DAY,
    p_global: GLOBAL_PER_DAY,
  })
  if (claimError) {
    console.error('claim_ai_request', claimError)
    return reply({ error: 'failed' }, 500)
  }
  if (claim !== 'ok') return reply({ error: claim }, 429)

  const messages = buildMessages(input)
  try {
    let model = MODELS[0]
    let answer = await askMistral(apiKey, model, messages, true)
    if (answer.status === 429) {
      model = MODELS[1]
      await pause(1200)
      answer = await askMistral(apiKey, model, messages, true)
    }
    // Structured output refused for this model or plan: ask for plain JSON, with the shape spelled out.
    if (answer.status === 400 || answer.status === 422) {
      const shaped = [
        { ...messages[0], content: `${messages[0].content}\nThe JSON must follow this JSON Schema:\n${JSON.stringify(responseSchema)}` },
        messages[1],
      ]
      await pause(1500)
      answer = await askMistral(apiKey, model, shaped, false)
    }
    if (answer.status === 429) {
      await admin.rpc('release_ai_request', { p_user: user.id })
      return reply({ error: 'busy' }, 503)
    }
    const comparison = answer.content ? parseComparison(answer.content, input.places.length) : null
    if (!comparison) {
      console.error('mistral', answer.status, answer.content?.slice(0, 500))
      await admin.rpc('release_ai_request', { p_user: user.id })
      return reply({ error: 'failed' }, 502)
    }
    await admin.from('ai_comparisons').upsert({ key, result: comparison })
    return reply({ comparison, cached: false })
  } catch (error) {
    console.error('compare-destinations', error)
    await admin.rpc('release_ai_request', { p_user: user.id })
    return reply({ error: 'failed' }, 502)
  }
})
