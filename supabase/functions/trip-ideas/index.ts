/**
 * trip-ideas: "Trova la meta" on the globe (Mistral).
 *   { action: 'suggest', criteria, lang, origin, exclude }  → 3 destinations that fit the choices
 *   { action: 'itinerary', place, days, criteria, lang }     → a day-by-day plan for one of them
 *
 * Signed-in users only (guests included); answers cached for everyone, daily limits per user and overall.
 * Replies { result, cached } or { error } (see ../_shared/ai.ts).
 */
import { answer, callerId, CORS, parseJson, reply } from '../_shared/ai.ts'
import {
  itineraryKey,
  itineraryMessages,
  itinerarySchema,
  parseIdeas,
  parseItinerary,
  readItinerary,
  readSuggest,
  suggestKey,
  suggestMessages,
  suggestSchema,
} from './ideas.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return reply({ error: 'bad_request' }, 405)

  const user = await callerId(req)
  if (!user) return reply({ error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return reply({ error: 'bad_request' }, 400)

  if (body.action === 'suggest') {
    const input = readSuggest(body)
    return answer({
      user,
      kind: 'suggest',
      cacheKey: suggestKey(input),
      perUser: 25,
      global: 800,
      messages: suggestMessages(input),
      schema: suggestSchema,
      maxTokens: 1200,
      parse: (raw) => parseIdeas(parseJson(raw)),
    })
  }

  if (body.action === 'itinerary') {
    const input = readItinerary(body)
    if (!input) return reply({ error: 'bad_request' }, 400)
    return answer({
      user,
      kind: 'itinerary',
      cacheKey: itineraryKey(input),
      perUser: 10,
      global: 400,
      messages: itineraryMessages(input),
      schema: itinerarySchema,
      // About 350 tokens a day, with room to spare.
      maxTokens: Math.min(9000, 600 + input.days * 380),
      parse: (raw) => parseItinerary(parseJson(raw), input.days),
    })
  }

  return reply({ error: 'bad_request' }, 400)
})
