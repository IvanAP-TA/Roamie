import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { loadPlaces } from '../places.mjs'
import { littleText } from '../publish/make.mjs'
import { checkX, writeXPost, X_KINDS } from './x.mjs'
import { assemblePost, buildFacts, CARDS, checkPost, FEATURES, INSIGHTS, LESSONS, makeLinkedInPlan, SCHEDULE, unknownNames, withoutLongDashes, writeLinkedInPost } from './posts.mjs'

const places = loadPlaces()
const DAY = 86_400_000
// 2026-10-19 is a Monday.
const monday = new Date('2026-10-19T08:00:00Z')
const on = (offset) => new Date(monday.getTime() + offset * DAY)

const GOOD = `Most group trips don't fail on the destination. They fail in the group chat.

Someone suggests a place, three people react, a meme arrives, and by the evening the idea is buried under new messages. A week later nobody remembers what was agreed.

What helps is boring and simple: put every option in one place, where it stays visible, and let everyone say what they think of each one before deciding.

How does your group usually decide where to go?`

describe('LinkedIn plan', () => {
  it('follows the week: build, insight, destination, feature, month, lesson, destination', () => {
    expect(SCHEDULE).toEqual(['destination', 'build', 'insight', 'destination', 'feature', 'month', 'lesson'])
    const kinds = [0, 1, 2, 3, 4, 5, 6].map((d) => makeLinkedInPlan({ places, history: [], today: on(d), commits: ['Wheel result reveal', 'Faster trip pages'] }).kind)
    expect(kinds).toEqual(['build', 'insight', 'destination', 'feature', 'month', 'lesson', 'destination'])
  })

  it('tells the week only with at least two real changes, otherwise explains a feature', () => {
    expect(buildFacts(['Bump to 1.1.8', 'Merge branch x', 'Animations, phase 3: covers with depth (1.1.7)', 'Fix typo'])).toEqual(['Animations, phase 3: covers with depth'])
    expect(makeLinkedInPlan({ places, history: [], today: monday, commits: ['Bump to 1.1.8'] }).kind).toBe('feature')
  })

  it('goes through every feature, insight and lesson before repeating one', () => {
    for (const [kind, pool] of [['feature', FEATURES], ['insight', INSIGHTS], ['lesson', LESSONS]]) {
      const history = []
      for (let i = 0; i < pool.length; i++) {
        process.env.LINKEDIN_KIND = kind
        const plan = makeLinkedInPlan({ places, history, today: on(i) })
        history.push({ date: on(i).toISOString(), kind: plan.kind, topic: plan.topic })
      }
      delete process.env.LINKEDIN_KIND
      expect(new Set(history.map((h) => h.topic)).size).toBe(pool.length)
    }
  })

  it('uses only cards that exist', () => {
    for (const item of [...FEATURES, ...INSIGHTS, ...LESSONS]) expect(CARDS).toContain(item.card)
    for (const name of CARDS) expect(existsSync(new URL(`./cards/${name}.jpg`, import.meta.url))).toBe(true)
  })

  it('picks a destination not posted in the last three months, with its photo, credit and guide', () => {
    const recent = places.slice(0, 40).map((p) => p.key)
    const history = [{ date: on(-10).toISOString(), kind: 'destination', places: recent }]
    const plan = makeLinkedInPlan({ places, history, today: on(2) })
    expect(plan.kind).toBe('destination')
    expect(recent).not.toContain(plan.places[0])
    expect(plan.image.photo.url).toMatch(/^https:\/\/[a-z]+\.wikimedia\.org\//)
    expect(plan.credit).toMatch(/^Photo: .+, Wikimedia Commons$/)
    expect(plan.link).toMatch(/^https:\/\/roamie\.org\/en\/guides\//)
  })

  it('suggests next month with three places at their best then and the month page', () => {
    const plan = makeLinkedInPlan({ places, history: [], today: on(4) })
    expect(plan.kind).toBe('month')
    expect(plan.month).toBe(11)
    expect(plan.places).toHaveLength(3)
    for (const key of plan.places) expect(places.find((p) => p.key === key).months).toContain(11)
    expect(plan.link).toBe('https://roamie.org/en/guides/where-to-go-in-november')
  })
})

describe('LinkedIn checks', () => {
  const plan = makeLinkedInPlan({ places, history: [], today: on(1) })

  it('accepts a calm post with paragraphs and a closing question', () => {
    expect(checkPost(GOOD, plan, [])).toBeNull()
  })

  it('rejects what doesn’t belong on the page', () => {
    expect(checkPost(GOOD.replace('simple:', 'simple 🚀:'), plan, [])).toBe('emoji')
    expect(checkPost(GOOD.replace('A week later', 'In 2025, 73 groups'), plan, [])).toMatch(/number/)
    expect(checkPost(`${GOOD} #travel`, plan, [])).not.toBeNull()
    expect(checkPost(GOOD.replace(/\?$/, '.'), plan, [])).toBe('no closing question')
    expect(checkPost(GOOD.replace('What helps', '- What helps'), plan, [])).toBe('bullets')
    expect(checkPost(GOOD.replace('boring and simple', 'a real game-changer'), plan, [])).toBe('buzzwords')
    expect(checkPost(GOOD.replace('meme arrives', 'meme arrives!'), plan, [])).toBe('exclamation')
    expect(checkPost(GOOD.slice(0, 300), plan, [])).toMatch(/length/)
    expect(checkPost(GOOD, plan, ["Most group trips don't fail on the destination. They fail in the group chat."])).toMatch(/earlier post/)
  })

  it('allows the numbers that are in the facts', () => {
    const lesson = { kind: 'lesson', facts: 'from about 1 MB to under 200 KB' }
    expect(checkPost(GOOD.replace('A week later', 'From 1 MB to 200 KB, and a week later'), lesson, [])).toBeNull()
  })

  it('adds the link, the photo credit and the hashtags itself', () => {
    const destination = makeLinkedInPlan({ places, history: [], today: on(2) })
    const post = assemblePost(GOOD, destination)
    expect(post.startsWith(GOOD)).toBe(true)
    expect(post).toContain(`The guide: ${destination.link}`)
    expect(post).toContain(destination.credit)
    expect(post.trim().split('\n').at(-1)).toMatch(/^(#\w+ ?){3}$/)
  })

  it('tries the AI five times, then gives up rather than posting a weak text', async () => {
    let calls = 0
    const bad = await writeLinkedInPost(plan, [], async () => (calls++, { post: 'Too short?' }))
    expect(calls).toBe(5)
    expect(bad.text).toBeNull()
    const good = await writeLinkedInPost(plan, [], async () => ({ post: GOOD }))
    expect(good.text).toBe(GOOD)
  })
})

describe('LinkedIn text format', () => {
  it('escapes what LinkedIn would cut the post at, and keeps hashtags clickable', () => {
    const post = 'Photo: Jane Doe (CC BY-SA 4.0), Wikimedia Commons\n\n#grouptravel #travel'
    expect(littleText(post)).toBe(String.raw`Photo: Jane Doe \(CC BY-SA 4.0\), Wikimedia Commons` + '\n\n' + String.raw`{hashtag|\#|grouptravel} {hashtag|\#|travel}`)
    expect(littleText(String.raw`a_b [c] @d *e* ~f~ <g> {h} |i| \j`)).toBe(String.raw`a\_b \[c\] \@d \*e\* \~f\~ \<g\> \{h\} \|i\| \\j`)
  })
})

describe('LinkedIn facts', () => {
  const facts = '- Granada (Spain): every drink comes with a free tapa, the Alhambra to book well ahead and sunset from the Mirador de San Nicolás.'

  it('rejects places and names the facts don’t have', () => {
    const text = 'November suits Granada. The Alhambra—booked early—is calm, and the Old Quarter of Hanoi or Andalusia’s coast are close.'
    expect(unknownNames(text, facts)).toEqual(['Old', 'Quarter', 'Hanoi', 'Andalusia'])
  })

  it('accepts the names in the facts, sentence openers, months and Roamie', () => {
    const text = 'In November, Granada is easy. Watch the sunset from the Mirador de San Nicolás. We built Roamie for this. On LinkedIn, Monday posts are ours.'
    expect(unknownNames(text, facts)).toEqual([])
  })

  it('takes the post out of quotation marks the AI sometimes puts around it', async () => {
    const plan = { kind: 'insight', facts: 'group chat' }
    const quoted = await writeLinkedInPost(plan, [], async () => ({ post: `"${GOOD}` }))
    expect(quoted.text).toBe(GOOD)
  })
})

describe('LinkedIn style and repetition', () => {
  const plan = { kind: 'insight', facts: 'group chat' }

  it('rejects long dashes', () => {
    expect(checkPost(GOOD.replace('boring and simple:', 'boring and simple —'), plan, [])).toBe('dash')
    expect(checkPost(GOOD.replace('boring and simple:', 'boring and simple –'), plan, [])).toBe('dash')
  })

  it('rejects a post too close to an earlier one, even with a new first line', () => {
    const again = GOOD.replace("Most group trips don't fail on the destination. They fail in the group chat.", 'Group chats are where trips go to die, and we have seen it happen again and again.')
    expect(checkPost(again, plan, [], [GOOD])).toBe('too close to an earlier post')
    expect(checkPost(GOOD, plan, [], ['A completely different post about our new map, the colours of its pins and why we kept it simple.'])).toBeNull()
  })
})

describe('LinkedIn fallbacks', () => {
  it('checks names only on posts about places, where invented details hurt', () => {
    const named = GOOD.replace('in the group chat.', 'in the group chat, on WhatsApp.')
    expect(checkPost(named, { kind: 'insight', facts: 'group chat' }, [])).toBeNull()
    expect(checkPost(named, { kind: 'destination', facts: 'group chat' }, [])).toMatch(/names not in the facts/)
  })

  it('can be asked for a given kind of post', () => {
    expect(makeLinkedInPlan({ places, history: [], today: on(5), kind: 'feature' }).kind).toBe('feature')
  })
})

describe('LinkedIn variety', () => {
  const plan = { kind: 'insight', facts: 'group chat' }

  it('rejects a post that opens with the same words as an earlier one', () => {
    expect(checkPost(GOOD, plan, ['Most group trips are planned in a hurry, and it shows.'])).toBe('same opening as an earlier post')
  })

  it('turns the long dashes the AI insists on into commas', () => {
    expect(withoutLongDashes('Simple — and free. The Alhambra—booked early—is calm —.')).toBe('Simple, and free. The Alhambra, booked early, is calm.')
  })

  it('writes the post with commas instead of throwing it away for its dashes', async () => {
    const dashed = GOOD.replace('boring and simple:', 'boring and simple —')
    const written = await writeLinkedInPost(plan, [], async () => ({ post: dashed }))
    expect(written.text).toBe(GOOD.replace('boring and simple:', 'boring and simple,'))
  })

  it('does not show the same card as one of the last three posts', () => {
    const history = ['home', 'places', 'wheel'].map((card, i) => ({ date: on(i - 3).toISOString(), kind: 'feature', topic: `x${i}`, card }))
    for (let d = 0; d < 7; d++) {
      const p = makeLinkedInPlan({ places, history, today: on(d), kind: 'feature' })
      expect(['home', 'places', 'wheel']).not.toContain(p.image.card)
    }
  })
})

describe('LinkedIn weekly changes', () => {
  it('keeps only the changes people using Roamie notice', () => {
    expect(
      buildFacts([
        'City photos on the landing\'s postcards; no long dashes and no repeated posts (1.1.14)',
        'LinkedIn bot: a post every day even when the first try fails (1.1.20)',
        'TikTok: upload videos in parts (1.1.16)',
        'Android app: the package is org.roamie.org',
        'Footer: TikTok icon',
        'Animations, phase 3: a header that follows the scroll (1.1.7)',
      ]),
    ).toEqual(["City photos on the landing's postcards", 'Animations, phase 3: a header that follows the scroll'])
  })
})

describe('X drafts', () => {
  const plan = { kind: 'lesson', facts: 'We cut the fonts to what the design uses. The landing score went from 84 to 94.' }
  const linkedIn = 'We cut the fonts to what the design uses, and the landing score went from 84 to 94.'
  const good = 'We cut our fonts down to what the design actually uses. The landing page score went from 84 to 94. Small files, big difference.'

  it('every day, places included: it is the brand account', () => {
    expect(X_KINDS).toEqual(['build', 'insight', 'feature', 'lesson', 'destination', 'month'])
  })

  it('takes a draft built from the facts, in the team voice', () => {
    expect(checkX(good, plan, linkedIn)).toBeNull()
  })

  it('rejects links, hashtags, invented numbers and names, and anything over 280 characters', () => {
    expect(checkX(`${good} roamie.org`, plan, linkedIn)).toBe('link')
    expect(checkX(`${good} #buildinpublic`, plan, linkedIn)).toBe('prices, hashtags or handles')
    expect(checkX(good.replace('94', '99'), plan, linkedIn)).toBe('number 99')
    expect(checkX(`${good} Next stop, Paris.`, plan, linkedIn)).toMatch(/names not in the facts/)
    expect(checkX(`${good} ${'a'.repeat(200)}`, plan, linkedIn)).toMatch(/^length/)
  })

  it('tries again when a draft is rejected, and gives up after three', async () => {
    const answers = [{ post: `${good} Great!` }, { post: good }]
    const result = await writeXPost(plan, linkedIn, async () => answers.shift())
    expect(result).toEqual({ text: good, rejected: ['exclamation'] })
    const never = await writeXPost(plan, linkedIn, async () => ({ post: 'We did it.' }))
    expect(never.text).toBeNull()
    expect(never.rejected).toHaveLength(3)
  })
})
