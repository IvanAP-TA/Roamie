/**
 * The words of a video: the hook on screen, the caption and the hashtags.
 *
 * The AI (Mistral) only writes the hook and two sentences of caption, from facts given to it; everything factual on
 * screen comes from the guides. Its text is accepted only if it passes every check below, otherwise it tries again,
 * and after three misses a hand-written line is used. Hashtags, links, credits and calls to action are never AI.
 */

// ── Hand-written lines: the fallback, and a style reference for the AI ──
// {month}, {a}, {b} and {n} are filled in from the plan.
export const POOLS = {
  it: {
    wheel: [
      'Non riuscite a decidere? Lasciate fare alla ruota',
      'Quattro mete, un gruppo, una ruota',
      'Il gruppo non si mette d’accordo? Gira',
      'Dove andiamo? Stavolta decide la ruota',
      'Quattro idee per il prossimo viaggio: ne resta una',
      'La chat litiga, la ruota sceglie',
      'Weekend con gli amici: chi vince?',
      'Pronti? Una sola meta resta in piedi',
    ],
    month: [
      'Dove andare a {month} con gli amici',
      'Tre mete che a {month} danno il meglio',
      '{month} è il mese giusto per queste tre',
      'Viaggio di gruppo a {month}? Partite da qui',
      'Tre idee per un {month} da ricordare',
      'A {month} il gruppo va qui',
    ],
    versus: [
      '{a} o {b}: voi dove andate?',
      'Weekend con gli amici: {a} o {b}?',
      '{a} contro {b}. Scegliete',
      'Il gruppo è diviso: {a} o {b}?',
      'Una sola tra {a} e {b}. Quale?',
      '{a} o {b}? Nei commenti',
    ],
    spin: ['Decide la ruota.', 'Si gira.', 'Ruota, pensaci tu.', 'Tre, due, uno…'],
    question: ['Voi quale scegliete?', 'Da che parte state?', 'Il vostro gruppo dove va?', 'Votate nei commenti'],
    cta: ['Decidete il prossimo viaggio insieme su roamie.org', 'Proponete, votate, girate la ruota: roamie.org', 'Il vostro gruppo decide su roamie.org, gratis'],
  },
  en: {
    wheel: [
      'Can’t decide? Let the wheel do it',
      'Four places, one group, one wheel',
      'The group chat can’t agree? Spin it',
      'Where are we going? The wheel decides',
      'Four ideas for the next trip: one survives',
      'The chat argues, the wheel picks',
      'Weekend with friends: who wins?',
      'Ready? Only one place stays standing',
    ],
    month: [
      'Where to go in {month} with friends',
      'Three places at their best in {month}',
      '{month} is the month for these three',
      'Group trip in {month}? Start here',
      'Three ideas for a {month} to remember',
      'In {month}, the group goes here',
    ],
    versus: [
      '{a} or {b}: where are you going?',
      'Weekend with friends: {a} or {b}?',
      '{a} vs {b}. Pick one',
      'The group is split: {a} or {b}?',
      'Only one of {a} and {b}. Which?',
      '{a} or {b}? Tell us below',
    ],
    spin: ['The wheel decides.', 'Spin it.', 'Over to you, wheel.', 'Three, two, one…'],
    question: ['Which one would you pick?', 'Whose side are you on?', 'Where is your group going?', 'Vote in the comments'],
    cta: ['Decide your next trip together at roamie.org', 'Propose, vote, spin the wheel: roamie.org', 'Your group decides at roamie.org, for free'],
  },
}

const HASHTAGS = {
  it: {
    base: ['#viaggiconamici', '#viaggiodigruppo', '#dovevado', '#weekendfuoriporta', '#ideeviaggio', '#viaggiare', '#travelitalia'],
    mood: { culture: '#cittadarte', food_wine: '#viaggigastronomici', nightlife: '#nightlife', relax: '#relax', adventure: '#avventura', nature: '#natura', family: '#viaggiinfamiglia', romantic: '#viaggiodicoppia' },
  },
  en: {
    base: ['#grouptrip', '#travelwithfriends', '#wheretonext', '#weekendgetaway', '#travelideas', '#tripplanning', '#bucketlist'],
    mood: { culture: '#citybreak', food_wine: '#foodtravel', nightlife: '#nightlife', relax: '#slowtravel', adventure: '#adventuretravel', nature: '#naturetravel', family: '#familytravel', romantic: '#romanticgetaway' },
  },
}

// Words only one of the two languages uses (no "a", "in" or "no", which both do).
const STOPWORDS = {
  it: ['il', 'lo', 'la', 'di', 'che', 'e', 'per', 'con', 'una', 'un', 'non', 'dove', 'del', 'della', 'gli', 'le', 'si', 'al', 'alla', 'ai', 'voi', 'vi', 'chi', 'quale', 'tra', 'da', 'ma', 'piu', 'vostro', 'vostra', 'questo', 'questa', 'mese', 'mete', 'meta', 'ruota', 'gruppo', 'amici', 'qui', 'o'],
  en: ['the', 'and', 'of', 'to', 'with', 'for', 'where', 'is', 'you', 'your', 'one', 'are', 'which', 'this', 'who', 'what', 'it', 'wheel', 'friends', 'group', 'places', 'here', 'or', 'vs'],
}

const BANNED = /garantit|guaranteed|migliore al mondo|best in the world|imperdibil|must[- ]see|\bsconto|\bdiscount|gratis per sempre|free forever|clicca|click here|link in bio|https?:|www\./i

export const monthName = (month, lang) => new Intl.DateTimeFormat(lang, { month: 'long' }).format(new Date(2026, month - 1, 15))

const fill = (line, vars) => line.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')

const normalize = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Word-trigram overlap (Jaccard), 0–1: how close a new line is to an old one. */
export function similarity(a, b) {
  const grams = (text) => {
    const words = normalize(text).split(' ')
    const set = new Set()
    for (let i = 0; i < words.length; i++) set.add(words.slice(i, i + 3).join(' '))
    return set
  }
  const x = grams(a)
  const y = grams(b)
  const common = [...x].filter((g) => y.has(g)).length
  return common / (x.size + y.size - common || 1)
}

/**
 * Whether `text` reads as `lang`: at least as many of its words as of the other language's. A line made only of
 * names ("Lisbona contro Porto. Scegliete") has none of either and passes.
 */
export function looksLike(text, lang) {
  const words = normalize(text).split(' ')
  const count = (l) => words.filter((w) => STOPWORDS[l].includes(w)).length
  const other = lang === 'it' ? 'en' : 'it'
  return count(lang) >= count(other)
}

/**
 * Every check an AI line must pass. Returns the reason it fails, or null.
 * `allowedNumbers`: digits it may contain (the counts on screen); anything else could be an invented fact.
 */
export function checkLine(text, { min, max, lang, past, maxSimilarity, mustMention = [], allowedNumbers = [] }) {
  if (typeof text !== 'string') return 'missing'
  const t = text.trim()
  if (t.length < min || t.length > max) return `length ${t.length}`
  if (BANNED.test(t)) return 'banned wording'
  if (/[€$£%#@]/.test(t)) return 'prices, hashtags or handles'
  for (const n of t.match(/\d+/g) ?? []) if (!allowedNumbers.includes(n)) return `number ${n}`
  if ((t.match(/\p{Extended_Pictographic}/gu) ?? []).length > 1) return 'emoji'
  if (t === t.toUpperCase() && /[A-Z]/.test(t)) return 'shouting'
  if (!looksLike(t, lang)) return 'language'
  for (const name of mustMention) if (!normalize(t).includes(normalize(name))) return `doesn't mention ${name}`
  for (const old of past) if (similarity(t, old) > maxSimilarity) return 'too close to an earlier post'
  return null
}

/** The least recently used hand-written line that isn't too close to a past one. */
export function pickFromPool(pool, vars, past, rand) {
  const lines = pool.map((l) => fill(l, vars))
  const fresh = lines.filter((l) => past.every((old) => similarity(l, old) <= 0.45))
  const choices = fresh.length ? fresh : lines
  return choices[Math.floor(rand() * choices.length)]
}

/** Hashtags chosen by code: two general ones (rotating), the places' moods, and one per place name. */
export function hashtags(plan, lang, rand) {
  const tags = HASHTAGS[lang]
  const base = [...tags.base].sort(() => rand() - 0.5).slice(0, 2)
  const moods = [...new Set(plan.places.flatMap((p) => p.moods))].slice(0, 2).map((m) => tags.mood[m]).filter(Boolean)
  const places = plan.places.slice(0, 3).map((p) => `#${normalize(p.name[lang]).replace(/ /g, '')}`)
  return [...new Set([...base, ...moods, ...places])].slice(0, 7)
}

const MODELS = ['ministral-14b-2512', 'ministral-8b-2512']

async function askMistral(messages) {
  const key = process.env.MISTRAL_API_KEY
  if (!key) return null
  for (const model of MODELS) {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0.9, max_tokens: 400, response_format: { type: 'json_object' } }),
      signal: AbortSignal.timeout(40_000),
    }).catch(() => null)
    if (!response?.ok) continue
    const data = await response.json()
    try {
      return JSON.parse(data.choices[0].message.content)
    } catch {
      return null
    }
  }
  return null
}

const FORMAT_BRIEF = {
  wheel: 'a wheel of fortune spins between four destinations and picks one, like friends deciding their next trip',
  month: 'three destinations at their best in {month}, for a group of friends',
  versus: 'two destinations side by side, asking the viewer which one their group would choose',
}

/**
 * Hook and caption for a plan. `past` holds earlier posts' hooks and captions in this language.
 * Returns { hook, caption, source: 'ai' | 'pool', rejected: [reasons] }.
 */
export async function writeCopy(plan, lang, past, rand, ask = askMistral) {
  const names = plan.places.map((p) => p.name[lang])
  const vars = { month: plan.month ? monthName(plan.month, lang) : '', a: names[0], b: names[1], n: String(names.length) }
  const pool = POOLS[lang]
  const allowedNumbers = [String(plan.places.length)]
  const mustMention = plan.format === 'versus' ? names : []
  const rejected = []

  const facts = plan.places.map((p) => `- ${p.name[lang]} (${p.country[lang]}): ${p.line[lang]}`).join('\n')
  const system = [
    `You write short-form video copy for Roamie, a free web app where groups of friends propose destinations, vote with points and spin a wheel to decide their trip.`,
    `Write in ${lang === 'it' ? 'Italian, natural and informal (tu/voi), like a friend' : 'English, natural and informal, like a friend'}.`,
    `The video: ${fill(FORMAT_BRIEF[plan.format], vars)}.`,
    `Return JSON {"hook": string, "caption": string}.`,
    `hook: the first words on screen, 25–55 characters, makes people stop scrolling; a question or a playful tension works. No emoji, no hashtags.`,
    `caption: two short sentences (80–220 characters), concrete, using only the facts given; end with a question to the viewer. No prices, no numbers, no links, no hashtags, at most one emoji.`,
    `Never invent facts. Different every time: here are lines already used, do not repeat their wording or structure:`,
    ...past.slice(-12).map((l) => `  · ${l}`),
    `Style examples (do not copy): ${pool[plan.format].slice(0, 3).map((l) => `"${fill(l, vars)}"`).join(', ')}.`,
  ].join('\n')
  const user = `Destinations:\n${facts}${plan.month ? `\nMonth: ${vars.month}` : ''}`

  for (let attempt = 0; attempt < 3; attempt++) {
    const answer = await ask([
      { role: 'system', content: system },
      { role: 'user', content: rejected.length ? `${user}\n\nYour previous answer was rejected (${rejected.at(-1)}). Try again.` : user },
    ])
    if (!answer) break
    const hookProblem = checkLine(answer.hook, { min: 20, max: 60, lang, past, maxSimilarity: 0.4, mustMention, allowedNumbers })
    const captionProblem = checkLine(answer.caption, { min: 60, max: 260, lang, past, maxSimilarity: 0.5, allowedNumbers })
    if (!hookProblem && !captionProblem) return { hook: answer.hook.trim(), caption: answer.caption.trim(), source: 'ai', rejected }
    rejected.push(hookProblem ? `hook: ${hookProblem}` : `caption: ${captionProblem}`)
  }

  const hook = pickFromPool(pool[plan.format], vars, past, rand)
  const caption =
    lang === 'it'
      ? `${names.join(', ').replace(/, ([^,]*)$/, ' e $1')}: ${plan.format === 'versus' ? 'voi quale scegliete?' : 'quale proporreste al vostro gruppo?'}`
      : `${names.join(', ').replace(/, ([^,]*)$/, ' and $1')}: ${plan.format === 'versus' ? 'which one would you pick?' : 'which one would you put to your group?'}`
  return { hook, caption, source: 'pool', rejected }
}
