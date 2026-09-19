/**
 * compare-destinations: an AI comparison of 2–3 places (Mistral), for the compare sheet.
 *
 * Signed-in users only (guests included). Answers are cached for everyone (see compare.ts: only public facts go in),
 * and each new answer counts toward a daily limit per user and a global one that protects the free Mistral quota.
 * Replies { result, cached } or { error } (see ../_shared/ai.ts).
 */
import { answer, callerId, CORS, reply } from '../_shared/ai.ts'
import { buildMessages, cacheKey, parseComparison, readInput, responseSchema } from './compare.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return reply({ error: 'bad_request' }, 405)

  const user = await callerId(req)
  if (!user) return reply({ error: 'unauthorized' }, 401)

  const input = readInput(await req.json().catch(() => null))
  if (!input) return reply({ error: 'bad_request' }, 400)

  return answer({
    user,
    kind: 'compare',
    cacheKey: cacheKey(input),
    perUser: 15,
    global: 400,
    messages: buildMessages(input),
    schema: responseSchema,
    parse: (raw) => parseComparison(raw, input.places.length),
  })
})
