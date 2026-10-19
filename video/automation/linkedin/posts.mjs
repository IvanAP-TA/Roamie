/**
 * LinkedIn posts for Roamie's company page, one a day: what kind of post, its facts, the words and the checks.
 *
 * LinkedIn reads differently from Reels and TikTok: a longer, calm text in the company's own voice, a few short
 * paragraphs, no emoji, a question at the end and a few hashtags. Each day of the week has its kind of post:
 *
 *   Mon  build        what changed in Roamie in the last week (from the commits on main)
 *   Tue  insight      how groups decide a trip, and where it goes wrong
 *   Wed  destination  one place from the guides, with its photo and the guide's link
 *   Thu  feature      one thing Roamie does, with a card of the app
 *   Fri  month        where to go next month, from the month pages
 *   Sat  lesson       something learnt building Roamie
 *   Sun  destination
 *
 * Facts only come from here (the guides, the briefs below, the commit messages): the AI writes the words, and its
 * text is used only if it passes every check (checkPost). Without a text that passes, there is no post that day.
 */
import { checkLine, monthName, photoCredit, similarity } from '../copy.mjs'
import { guideUrl } from '../places.mjs'
import { seeded } from '../plan.mjs'

const DAY = 86_400_000

export const SCHEDULE = ['destination', 'build', 'insight', 'destination', 'feature', 'month', 'lesson']

/** The app cards (linkedin/cards/*.jpg): a headline over a screenshot of the app, 1200×1500. */
export const CARDS = ['home', 'places', 'wheel', 'plan', 'map']

export const FEATURES = [
  { id: 'wheel', card: 'wheel', brief: 'The wheel: every place that received points becomes a slice, and more points make a bigger slice. Anyone in the group can spin it, or schedule the spin for a set time so everyone watches it live together.' },
  { id: 'points', card: 'places', brief: 'Voting with points: each member gives points to the places they like, so the group sees what people really want instead of counting replies in a chat.' },
  { id: 'secret', card: 'places', brief: 'The secret round: votes stay hidden until the reveal, so nobody just follows the first or the loudest opinion.' },
  { id: 'reasons', card: 'places', brief: 'Reasons: next to each proposed place, members write why they want to go, and the others can like a reason. A place with good reasons is easier to agree on.' },
  { id: 'dates', card: 'plan', brief: 'Finding dates: each member marks the days they are free, and Roamie finds the period that works for the group.' },
  { id: 'itinerary', card: 'plan', brief: 'The itinerary: the trip day by day, stops with times, reordered by dragging, so everyone knows the plan.' },
  { id: 'checklist', card: 'plan', brief: 'The shared checklist: what to book and what to pack, ticked off by whoever does it, so the organiser is not the only one keeping track.' },
  { id: 'map', card: 'map', brief: 'The map: every place the group proposed on one map, marked as proposed, picked or visited.' },
  { id: 'invite', card: 'home', brief: 'Joining a trip: friends join with a link or a short code, in the browser, with nothing to install. Roamie is free.' },
  { id: 'privacy', card: 'home', brief: 'Privacy: Roamie has no profiling cookies and no trackers. It only keeps what a trip needs.' },
  { id: 'languages', card: 'home', brief: 'Languages: Roamie speaks Italian, English and Spanish, and each member uses their own, in the same trip.' },
]

export const INSIGHTS = [
  { id: 'chat', card: 'home', brief: 'Group trips often stall in the group chat: ideas get buried under new messages, nobody knows what was agreed, and the decision keeps moving to next week. Collecting the options in one place first changes the conversation.' },
  { id: 'anchoring', card: 'places', brief: 'The first opinion shared in a group tends to anchor everyone else, and the loudest voice often wins by default. Voting before seeing the others’ votes gives quieter people a real say.' },
  { id: 'options', card: 'wheel', brief: 'Too many options make a group decide nothing. A short list of places that people actually care about is easier to choose from than an open question.' },
  { id: 'dates-first', card: 'plan', brief: 'Many groups pick a destination and then discover half of them can’t make the dates. Settling when everyone is free before where to go saves a lot of back and forth.' },
  { id: 'budget', card: 'places', brief: 'Money is the topic groups avoid. People don’t like to say a place is too expensive for them, so they go quiet instead. Making the budget level of each option visible early keeps it from becoming awkward later.' },
  { id: 'organiser', card: 'plan', brief: 'In most groups one person ends up organising everything: dates, bookings, reminders. Sharing the plan and the to-do list so others can pick up tasks keeps that person from burning out.' },
  { id: 'deadline', card: 'wheel', brief: 'A group without a deadline keeps discussing. Setting a moment when the decision is made, and sticking to it, ends the loop, even when the result is not everyone’s first choice.' },
  { id: 'why', card: 'places', brief: 'Saying why you want to go somewhere is more persuasive than just voting for it. A good reason, like a cheap direct flight or a friend who lives there, often changes minds.' },
]

export const LESSONS = [
  { id: 'phones', card: 'home', brief: 'What feels fast on a laptop can feel slow on a mid-range phone. We now test every change on a simulated mid-range phone, with a slowed processor, before it ships, and measure instead of guessing.' },
  { id: 'images', card: 'home', brief: 'Photos were most of the weight of our guide pages. Serving them in a modern format (AVIF) at the size they are shown took the images of the guides page from about 1 MB to under 200 KB.' },
  { id: 'prerender', card: 'home', brief: 'Our guide pages now arrive as ready-made pages that the app then takes over without redrawing them. On a simulated mid-range phone, the main content of the guides page appears in under a second instead of almost three.' },
  { id: 'animations', card: 'wheel', brief: 'A tester told us the new page transitions felt slow on their phone, while they were perfect on a computer. We measured it: the phone was busy building the new page while animating it. We now let the graphics chip play the animation and build the heavy part of the page right after.' },
  { id: 'trackers', card: 'home', brief: 'We decided early not to use profiling cookies or trackers. It means we know less about how people use Roamie, but there is no consent banner to click through and nothing to hide.' },
  { id: 'feedback', card: 'places', brief: 'Our best improvements came from watching real groups use Roamie and from short messages from testers, not from our own ideas of what was missing.' },
  { id: 'facts', card: 'map', brief: 'Our travel guides and social posts use only facts we checked ourselves. When we use AI to help write, it only gets to choose the words, and every text goes through checks before it is published.' },
]

// Commits about the repository rather than the app don't make a "this week" post.
const MECHANICAL = /\b(bump|merge|typo|lint|tests?|ci|deps|dependenc|readme|licen[cs]e|environment values|gitignore|refactor|backup)\b/i

// Changes behind the scenes (our own social posts, the Android package, store listings): true, but nothing a person
// using Roamie sees, and an AI asked to tell users about them makes up a user-facing story.
const BEHIND_THE_SCENES = /\b(posts?|linkedin|tiktok|youtube|instagram|facebook|social|bot|telegram|make\.com|android|package|manifest|digital asset links|play store|footer)\b/i

/**
 * The changes worth telling, from commit subjects: the version number in brackets dropped, and a subject that joins
 * several changes ("City photos on the postcards; no repeated posts") split, keeping only the parts users notice.
 */
export const buildFacts = (subjects) =>
  [
    ...new Set(
      subjects
        .flatMap((s) => s.replace(/\s*\(\d+\.\d+\.\d+\)\s*$/, '').split(/;\s*/))
        .map((s) => s.trim())
        .filter((s) => s && !MECHANICAL.test(s) && !BEHIND_THE_SCENES.test(s)),
    ),
  ].slice(0, 8)

const within = (entry, today, days) => today - new Date(entry.date) < days * DAY
const pick = (list, rand) => list[Math.floor(rand() * list.length)]

/** The least recently used item of a pool (by id), random among those never or longest ago used. */
function leastRecent(pool, history, kind, rand) {
  const lastUse = (id) => Math.max(-1, ...history.map((h, i) => (h.kind === kind && h.topic === id ? i : -1)))
  const sorted = [...pool].sort((a, b) => lastUse(a.id) - lastUse(b.id))
  const oldest = lastUse(sorted[0].id)
  return pick(
    sorted.filter((item) => lastUse(item.id) === oldest),
    rand,
  )
}

/**
 * The card for a post: the one that fits its topic, unless one of the last three posts showed it (the same picture
 * two days running reads as the same post); then the card shown least recently.
 */
function freshCard(preferred, history, rand) {
  const recent = history.filter((h) => !h.failed).slice(-3).map((h) => h.card)
  if (preferred && !recent.includes(preferred)) return preferred
  const lastShown = (card) => Math.max(-1, ...history.map((h, i) => (h.card === card ? i : -1)))
  const oldest = Math.min(...CARDS.map(lastShown))
  return pick(CARDS.filter((card) => lastShown(card) === oldest), rand)
}

/**
 * Today's post: { kind, topic, facts, image, link, credit }. `image` is { card } or { photo }; `commits` are the last
 * week's commit subjects (for the Monday post).
 */
export function makeLinkedInPlan({ places, history, today, commits = [], kind: forced }) {
  const rand = seeded(`${today.toISOString().slice(0, 10)}|linkedin|${history.length}`)
  let kind = forced || process.env.LINKEDIN_KIND || SCHEDULE[today.getUTCDay()]

  if (kind === 'build') {
    const facts = buildFacts(commits)
    if (facts.length >= 2) return { kind, topic: today.toISOString().slice(0, 10), facts: facts.map((f) => `- ${f}`).join('\n'), image: { card: freshCard(undefined, history, rand) }, link: 'https://roamie.org/en' }
    kind = 'feature'
  }
  if (kind === 'feature' || kind === 'insight' || kind === 'lesson') {
    const pool = { feature: FEATURES, insight: INSIGHTS, lesson: LESSONS }[kind]
    const item = leastRecent(pool, history, kind, rand)
    return { kind, topic: item.id, facts: item.brief, image: { card: freshCard(item.card, history, rand) }, link: 'https://roamie.org/en' }
  }

  const recent = new Set(history.filter((h) => within(h, today, 90)).flatMap((h) => h.places ?? []))
  const usable = places.filter((p) => !recent.has(p.key))
  const fresh = usable.length >= 3 ? usable : places

  if (kind === 'month') {
    const month = new Date(today.getTime() + 30 * DAY).getUTCMonth() + 1
    const inSeason = fresh.filter((p) => p.months.includes(month))
    if (inSeason.length >= 3) {
      const chosen = [...inSeason].sort(() => rand() - 0.5).slice(0, 3)
      const name = monthName(month, 'en')
      return {
        kind,
        topic: `month-${month}`,
        month,
        places: chosen.map((p) => p.key),
        facts: [`Month: ${name}`, ...chosen.map(placeFacts)].join('\n'),
        image: { photo: chosen[0].photo },
        credit: `Photo: ${photoCredit(chosen[0].photo)}, Wikimedia Commons`,
        link: `https://roamie.org/en/guides/where-to-go-in-${name.toLowerCase()}`,
      }
    }
    kind = 'destination'
  }

  const place = pick(fresh, rand)
  return {
    kind: 'destination',
    topic: place.key,
    places: [place.key],
    facts: placeFacts(place),
    image: { photo: place.photo },
    credit: `Photo: ${photoCredit(place.photo)}, Wikimedia Commons`,
    link: guideUrl(place, 'en'),
  }
}

const BUDGET = { 1: 'easy on the budget', 2: 'mid-range budget', 3: 'a pricier trip' }
const MOODS = { culture: 'culture', food_wine: 'food and wine', nightlife: 'nightlife', nature: 'nature', adventure: 'adventure', romantic: 'romantic', relax: 'relaxing', family: 'families' }

function placeFacts(p) {
  const months = p.months.map((m) => monthName(m, 'en')).join(', ')
  const moods = p.moods.map((m) => MOODS[m] ?? m.replace(/_/g, ' ')).join(', ')
  return `- ${p.name.en} (${p.country.en}): ${p.text?.en ?? p.line.en} Good for: ${moods}. Best months: ${months}. ${BUDGET[p.budget] ?? ''}.`
}

const BRIEF = {
  build: 'a short "what we worked on this week" update from the team, explaining in plain words what changed for the people using Roamie (not how it was built). The facts are the week’s changes to the Roamie app, written by the developers: translate them into what a user notices, skip what a user would not notice, and never describe anything that isn’t in them (no new features, no fixed problems that aren’t listed)',
  insight: 'an observation about how groups of friends decide a trip together, and what helps. Roamie can be mentioned once, lightly, near the end, or not at all',
  feature: 'one thing Roamie does, explained through the problem it solves for a group planning a trip',
  lesson: 'something the team learnt while building Roamie, told honestly and without bragging, useful to other people who build products',
  destination: 'one destination from Roamie’s travel guides, presented as an idea for a group trip with friends (or colleagues)',
  month: 'where a group could travel next month: the destinations given, at their best that month',
}

/** The numbers a text may contain: those in its facts. Anything else could be an invented figure. */
export const numbersIn = (text) => [...new Set(text.match(/\d+/g) ?? [])]

/** The messages for the AI. `past` holds the first lines of earlier posts. */
export function linkedInPrompt(plan, past) {
  const system = [
    'You write LinkedIn posts for the company page of Roamie, a free web app where groups of friends propose destinations, vote with points and spin a wheel to decide their trip together.',
    'Voice: the small team behind Roamie, writing as "we". Human, warm and humble: no hype, no buzzwords, no exclamation marks, no emoji, no "game-changer", no "excited to announce". Plain English, like a thoughtful person talking.',
    `This post: ${BRIEF[plan.kind]}.`,
    'Shape: a first line that makes people want to read on (under 140 characters, no question marks needed), then 2 to 4 short paragraphs separated by a blank line, and a last line asking the reader a genuine question.',
    'Length: 500 to 1100 characters in total. No hashtags, no links, no markdown (no asterisks, underscores or bullet symbols), no @ mentions.',
    'Use only the facts given. Never invent numbers, quotes, customers, users counts or results. Do not add places, landmarks, neighbourhoods, weather, prices or anything else that is not in the facts, even if you believe it is true: a shorter post is better than an invented detail. Do not name any place or proper noun that is not in the facts.',
    'Write the post itself, not wrapped in quotation marks. Never use em dashes or en dashes (— or –): use commas, colons or full stops.',
    'Return JSON {"post": string}.',
    ...(past.length ? ['Earlier posts started like this; start differently (never with the same first words), and do not reuse their wording or structure:', ...past.slice(-10).map((l) => `  · ${l}`)] : []),
  ].join('\n')
  return [
    { role: 'system', content: system },
    { role: 'user', content: `Facts:\n${plan.facts}` },
  ]
}

const firstLine = (text) => text.trim().split('\n')[0].trim()
/** The first three words, lowercased: two posts that open alike look like the same post in the feed. */
const openingWords = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).slice(0, 3).join(' ')

/**
 * The AI's long dashes, as commas: it uses them almost every time and asking doesn't stop it, so rejecting them only
 * spent the tries. A dash before punctuation disappears, any other becomes a comma.
 */
export const withoutLongDashes = (text) =>
  text
    .replace(/\s*[—–]\s*(?=[.,;:!?])/g, '')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/,\s*,/g, ',')

// Capitalised words that may appear without being in the facts: the product, the platform, the language, months and
// days, and the words that open a sentence anyway.
const ALWAYS_NAMED = new Set(['roamie', 'linkedin', 'english', 'italian', 'spanish', 'ai', 'i', 'we', 'our', 'it', 'its'])
const CALENDAR = [...Array(12)].map((_, m) => monthName(m + 1, 'en').toLowerCase()).concat(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
const fold = (word) => word.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/**
 * The proper nouns of a text that its facts don't contain: capitalised words that don't open a sentence. A landmark or
 * a region the AI added on its own shows up here.
 */
export function unknownNames(text, facts) {
  const known = fold(facts)
  const names = []
  for (const sentence of text.split(/(?<=[.!?:])\s+|\n+/)) {
    const words = sentence.trim().split(/[\s—–]+/).slice(1)
    for (const raw of words) {
      const word = raw.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '').replace(/[’']s$/, '')
      if (!/^\p{Lu}/u.test(word)) continue
      const f = fold(word)
      if (ALWAYS_NAMED.has(f) || CALENDAR.includes(f) || known.includes(f)) continue
      names.push(word)
    }
  }
  return [...new Set(names)]
}

/**
 * Every check a post must pass. Returns the reason it fails, or null. `past` holds earlier posts' first lines,
 * `pastTexts` their whole texts.
 */
export function checkPost(text, plan, past, pastTexts = []) {
  if (typeof text !== 'string') return 'missing'
  const t = text.trim()
  if (t.length < 400 || t.length > 1300) return `length ${t.length}`
  if (/\p{Extended_Pictographic}/u.test(t)) return 'emoji'
  if (/!/.test(t)) return 'exclamation'
  if (/^\s*[-•·]\s/m.test(t)) return 'bullets'
  if (/game[- ]changer|excited to|thrilled|revolutioni[sz]|disrupt|seamless|unlock|leverage/i.test(t)) return 'buzzwords'
  if (t.split(/\n\s*\n/).length < 3) return 'paragraphs'
  if (!/\?\s*$/.test(t)) return 'no closing question'
  if (firstLine(t).length > 160) return 'first line too long'
  // Places are where invented details hurt (a landmark that isn't there): posts about places name nothing else.
  if (plan.kind === 'destination' || plan.kind === 'month') {
    const unknown = unknownNames(t, plan.facts)
    if (unknown.length) return `names not in the facts: ${unknown.slice(0, 4).join(', ')}`
  }
  for (const paragraph of t.split(/\n\s*\n/)) {
    // The short-form checks (banned words, prices, numbers, formatting, language), paragraph by paragraph.
    const problem = checkLine(paragraph, { min: 1, max: 900, lang: 'en', past: [], maxSimilarity: 1, allowedNumbers: numbersIn(plan.facts) })
    if (problem) return problem
  }
  const opening = openingWords(t)
  if (past.some((old) => openingWords(old) === opening)) return 'same opening as an earlier post'
  for (const old of past) if (similarity(firstLine(t), old) > 0.3) return 'too close to an earlier post'
  // Whole texts share a few word triples by chance; a quarter of them means the same post again.
  for (const old of pastTexts) if (similarity(t, old) > 0.25) return 'too close to an earlier post'
  return null
}

const HASHTAGS = {
  build: ['#buildinpublic', '#productdevelopment', '#startup'],
  insight: ['#grouptravel', '#travel', '#decisionmaking'],
  feature: ['#grouptravel', '#travelplanning', '#productdesign'],
  lesson: ['#buildinpublic', '#webperformance', '#productdevelopment'],
  destination: ['#grouptravel', '#travel', '#travelplanning'],
  month: ['#grouptravel', '#travel', '#travelinspiration'],
}

/** The post as published: the AI's text, then the link, the photo credit and the hashtags (never AI). */
export function assemblePost(text, plan) {
  const link = plan.kind === 'destination' ? `The guide: ${plan.link}` : plan.kind === 'month' ? `More places for this month: ${plan.link}` : `Roamie is free: ${plan.link}`
  return [text.trim(), link, ...(plan.credit ? [plan.credit] : []), HASHTAGS[plan.kind].join(' ')].join('\n\n')
}

/** Writes the post: up to five tries with the AI. Returns { text, rejected } or { text: null, rejected }. */
export async function writeLinkedInPost(plan, past, ask, pastTexts = []) {
  const rejected = []
  const messages = linkedInPrompt(plan, past)
  for (let attempt = 0; attempt < 5; attempt++) {
    const answer = await ask(rejected.length ? [...messages, { role: 'user', content: `Your previous answer was rejected (${rejected.at(-1)}). Try again.` }] : messages)
    if (!answer) break
    // Some answers come wrapped in quotation marks, sometimes only on one side.
    const post = typeof answer.post === 'string' ? withoutLongDashes(answer.post.trim().replace(/^["“”]+|["“”]+$/g, '').trim()) : answer.post
    const problem = checkPost(post, plan, past, pastTexts)
    if (!problem) return { text: post, rejected }
    rejected.push(problem)
  }
  return { text: null, rejected }
}

export const postFirstLine = firstLine
