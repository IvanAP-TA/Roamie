import { describe, expect, it } from 'vitest'
import { writeCopy } from '../copy.mjs'
import { makeLinkedInPlan } from '../linkedin/posts.mjs'
import { loadPlaces } from '../places.mjs'
import { makePlan, seeded } from '../plan.mjs'
import { checkInsight, copiesSource, freshInsight, mergeBank, recentHooks, researchPrompt } from './insights.mjs'

const IDEA = {
  problem: 'Group chats bury every trip idea under new messages until nobody remembers what was agreed.',
  context: 'Someone proposes a place, a few people react, and the thread moves on. A week later the group starts again from zero.',
  linkedin_angle: 'Why the group chat is where trip plans go to die, and what a single shared list changes.',
  video_hook: 'Your group chat ate the trip plan again?',
}
const SOURCES = ['We tried to plan a trip in the group chat and it was chaos, nobody remembers anything', 'Planning anything with my friends takes forever']

describe('research ideas', () => {
  it('accepts an idea in our own words', () => {
    expect(checkInsight(IDEA, SOURCES)).toBeNull()
  })

  it('rejects quotes, names, links, numbers and copied sentences', () => {
    expect(checkInsight({ ...IDEA, problem: 'Users on r/travel say planning takes forever with friends.' }, SOURCES)).toMatch(/username/)
    expect(checkInsight({ ...IDEA, context: `${IDEA.context} About 70 percent of groups give up.` }, SOURCES)).toMatch(/number/)
    expect(checkInsight({ ...IDEA, video_hook: '"Nobody remembers anything" again?' }, SOURCES)).toMatch(/quotes/)
    expect(checkInsight({ ...IDEA, context: 'We tried to plan a trip in the group chat and it was chaos, nobody remembers anything.' }, SOURCES)).toMatch(/copies/)
    expect(checkInsight({ ...IDEA, video_hook: 'Group chat — the place trips go to die' }, SOURCES)).toMatch(/dash/)
    expect(copiesSource('totally new words here about something else entirely', SOURCES)).toBe(false)
  })

  it('keeps new ideas, leaves out ones too close to the bank, and gives each an id', () => {
    const today = new Date('2026-10-25T06:00:00Z')
    const bank = mergeBank([], [IDEA], today)
    expect(bank).toHaveLength(1)
    expect(bank[0].id).toBe('2026-10-25-1')
    const again = mergeBank(bank, [{ ...IDEA, problem: IDEA.problem.replace('every', 'each') }, { ...IDEA, problem: 'Nobody wants to say a place is too expensive for them, so the budget never gets discussed.' }], today)
    expect(again).toHaveLength(2)
  })

  it('hands LinkedIn the oldest idea no post has used, then the hand-written pool', () => {
    const bank = mergeBank([], [IDEA], new Date('2026-10-25T06:00:00Z'))
    expect(freshInsight(bank, [])).toEqual(bank[0])
    expect(freshInsight(bank, [{ topic: `research:${bank[0].id}` }])).toBeNull()

    const tuesday = new Date('2026-10-27T07:00:00Z')
    const plan = makeLinkedInPlan({ places: loadPlaces(), history: [], today: tuesday, bank })
    expect(plan.kind).toBe('insight')
    expect(plan.topic).toBe(`research:${bank[0].id}`)
    expect(plan.facts).toContain(IDEA.problem)
    const after = makeLinkedInPlan({ places: loadPlaces(), history: [{ date: tuesday.toISOString(), kind: 'insight', topic: plan.topic }], today: tuesday, bank })
    expect(after.topic.startsWith('research:')).toBe(false)
  })

  it('gives the video hook recent openers as inspiration, in the prompt only', async () => {
    const bank = mergeBank([], [IDEA], new Date('2026-10-25T06:00:00Z'))
    let prompt = ''
    const plan = makePlan(loadPlaces(), [], new Date('2026-10-26T16:00:00Z'), 'en')
    await writeCopy(plan, 'en', [], seeded('x'), async (messages) => ((prompt = messages[0].content), null), recentHooks(bank))
    expect(prompt).toContain(IDEA.video_hook)
  })

  it('asks for problems in our own words, without quotes or names', () => {
    const [system] = researchPrompt([{ title: 'Trip with friends', text: '', score: 10, comments: 5, top: ['It was chaos'] }])
    expect(system.content).toMatch(/never quote/)
  })
})
