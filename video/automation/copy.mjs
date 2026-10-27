/**
 * The words of a video: the hook on screen, the caption and the hashtags.
 *
 * The AI (Mistral) only writes the hook and two sentences of caption, from facts given to it; everything factual on
 * screen comes from the guides. Its text is accepted only if it passes every check below, otherwise it tries again,
 * and after three misses a hand-written line is used. Hashtags, links, credits and calls to action are never AI.
 */

// ── Hand-written lines: the fallback, and a style reference for the AI ──
// {month}, {a}, {b}, {n} and {theme} are filled in from the plan. Carousels use the carousel_* pools.
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
    story: [
      '{problem}',
      'Ogni gruppo ha questa chat',
      'Ditemi che non è la vostra chat',
      'La chat del gruppo, prima di Roamie',
      'Questa chat la conosciamo tutti',
    ],
    carousel_guide: [
      '{theme}: {n} mete da salvare',
      '{theme}: dove andare con il gruppo',
      '{theme}? Ecco {n} idee per il gruppo',
      '{n} mete per il gruppo · {theme}',
    ],
    carousel_month: [
      'Dove andare a {month} con gli amici: {n} mete',
      '{n} mete che a {month} danno il meglio',
      'A {month} si parte: {n} idee per il gruppo',
      'Salva queste {n} mete per {month}',
    ],
    spin: ['Decide la ruota.', 'Si gira.', 'Ruota, pensaci tu.', 'Tre, due, uno…'],
    carousel_signs: ['Riconoscete la vostra chat?', 'Ogni gruppo ha questi segnali', 'Il viaggio è ancora nella chat?', 'Mandatelo al vostro gruppo'],
    // The end of a versus and of a carousel: an invitation to send it on, the strongest signal for the feeds (a share in
    // a private message) and real word of mouth (Contenuti/Analisi virale in the brain, 2026-10-27).
    question: ['Mandalo al gruppo con cui partiresti', 'Mandalo alla chat che non decide mai', 'Taggate il vostro gruppo di viaggio', 'Il vostro gruppo quale sceglie?'],
    cta: [
      'Mandalo alla chat del gruppo che non decide mai. Poi decidete su roamie.org',
      'Tagga l’amico che dice sempre "decidete voi". Il viaggio si decide su roamie.org',
      'Giralo al gruppo di viaggio e lasciate scegliere la ruota: roamie.org',
    ],
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
    story: [
      '{problem}',
      'Every group has this chat',
      'Tell me this isn’t your group chat',
      'Your group chat, before Roamie',
      'We all know this group chat',
    ],
    carousel_guide: [
      '{theme}: {n} places to save',
      '{theme}: where should the group go?',
      '{theme}? Here are {n} ideas for your group',
      '{n} places for your group · {theme}',
    ],
    carousel_month: [
      'Where to go in {month} with friends: {n} ideas',
      '{n} places at their best in {month}',
      '{month} trip? {n} ideas for your group',
      'Save these {n} places for {month}',
    ],
    spin: ['The wheel decides.', 'Spin it.', 'Over to you, wheel.', 'Three, two, one…'],
    carousel_signs: ['Sound like your group chat?', 'Every group has these signs', 'Is your trip still in the chat?', 'Send this to your group'],
    question: ['Send this to the friend you’d go with', 'Send this to the group chat that never decides', 'Tag your travel group', 'Which one would your group pick?'],
    cta: [
      'Send this to the group chat that never decides. Then decide at roamie.org/en',
      'Tag the friend who always says "you guys decide". Plan it at roamie.org/en',
      'Share it with your travel group and let the wheel pick: roamie.org/en',
    ],
  },
}

// ── Hook styles: how the first words on screen open ──
// One per post (plan.mjs pickHookStyle), so the feed doesn't always open the same way: the AI writes the hook in the
// style it's given and a style with a `check` must pass it too. Instagram's numbers per style (metrics.mjs hookScores)
// nudge which styles come up more often, without ever dropping one. The examples are style references, never used.
export const HOOK_STYLES = {
  question: {
    brief: 'a direct question to the viewer about their own group and this choice',
    examples: { it: 'Il vostro gruppo dove andrebbe davvero?', en: 'Where would your group actually go?' },
    check: (t) => (t.trim().endsWith('?') ? null : 'not a question'),
  },
  pov: {
    brief: 'a line starting with "POV:" that describes a moment every group of friends lives while planning a trip',
    examples: { it: 'POV: la chat del gruppo litiga da una settimana', en: 'POV: the group chat has been arguing for a week' },
    check: (t) => (/^POV:/i.test(t.trim()) ? null : 'no POV opening'),
  },
  problem: {
    brief: 'a relatable problem of planning a trip with friends, said plainly, that this post helps with; not a question',
    examples: { it: 'Tutti dicono sì al viaggio, nessuno sceglie la meta', en: 'Everyone says yes to the trip, nobody picks a place' },
    check: (t) => (t.trim().endsWith('?') ? 'a question, not a problem' : null),
  },
  challenge: {
    brief: 'a playful challenge to the viewer: make them pick, or dare them to keep only one',
    examples: { it: 'Scegline una. Non puoi tenerle tutte', en: 'Pick one. You can’t keep them all' },
  },
  opinion: {
    brief: 'a bold, friendly opinion about trips with friends that people want to agree or argue with (an opinion, never a fact)',
    examples: { it: 'Opinione impopolare: il viaggio si decide in cinque minuti', en: 'Unpopular opinion: a trip should take five minutes to decide' },
  },
  curiosity: {
    brief: 'a curiosity gap: hint at something about these destinations without saying it, so people watch to the end',
    examples: { it: 'Una di queste nessuno del gruppo se l’aspetta', en: 'One of these is the place nobody in the group expects' },
  },
}

// ── Hashtags: chosen by code, never by the AI ──
// Ordered from the most specific (the places, their country, the post's theme) to the broad ones people follow, so a
// platform that only shows the first few (YouTube shows three) still shows the useful ones. Only tags in real use.
const HASHTAGS = {
  it: {
    broad: ['#viaggiconamici', '#viaggiodigruppo', '#ideeviaggio', '#doveandare', '#viaggiare', '#weekendfuoriporta', '#organizzareviaggi'],
    region: { europe: '#europa', asia: '#asia', africa: '#africa', americas: '#america' },
    month: (m) => `#viaggi${normalize(monthName(m, 'it'))}`,
    guide: {
      'long-weekends': ['#weekendlungo', '#citybreak'],
      budget: ['#viaggilowcost', '#viaggiareconpoco'],
      'summer-sea': ['#mare', '#vacanzealmare'],
      nature: ['#trekking', '#natura'],
      food: ['#viaggigastronomici', '#foodtravel'],
      nightlife: ['#nightlife', '#vacanzedidivertimento'],
      winter: ['#viaggiinvernali', '#mercatinidinatale'],
      bachelor: ['#addioalcelibato', '#addioalnubilato'],
      graduation: ['#viaggiodimaturita', '#maturita'],
      students: ['#viaggistudenti', '#weekendlowcost'],
      couples: ['#viaggidicoppia', '#viaggiinsieme'],
    },
    mood: { culture: '#cittadarte', food_wine: '#viaggigastronomici', nightlife: '#nightlife', relax: '#relax', adventure: '#avventura', nature: '#natura', family: '#viaggiinfamiglia', romantic: '#viaggiodicoppia' },
  },
  en: {
    broad: ['#grouptrip', '#travelwithfriends', '#travelplanning', '#traveltips', '#bucketlist', '#wanderlust', '#traveldestinations'],
    region: { europe: '#europetravel', asia: '#asiatravel', africa: '#africatravel', americas: '#latinamericatravel' },
    month: (m) => `#${normalize(monthName(m, 'en'))}travel`,
    guide: {
      'long-weekends': ['#citybreak', '#weekendgetaway'],
      budget: ['#budgettravel', '#cheaptravel'],
      'summer-sea': ['#beachvacation', '#summertravel'],
      nature: ['#hiking', '#naturetravel'],
      food: ['#foodietravel', '#foodtravel'],
      nightlife: ['#nightlife', '#partytrip'],
      winter: ['#wintertravel', '#christmasmarkets'],
      bachelor: ['#bachelorparty', '#bachelorettetrip'],
      graduation: ['#graduationtrip', '#seniortrip'],
      students: ['#studenttravel', '#budgettravel'],
      couples: ['#couplestravel', '#doubledate'],
    },
    mood: { culture: '#citybreak', food_wine: '#foodtravel', nightlife: '#nightlife', relax: '#slowtravel', adventure: '#adventuretravel', nature: '#naturetravel', family: '#familytravel', romantic: '#romanticgetaway' },
  },
}

// The country tags people actually use, where the plain name isn't it.
const COUNTRY_TAG = { GB: 'uk', CZ: 'czechrepublic', US: 'usa', NL: 'netherlands', TR: 'turkey' }
const REGION = { JP: 'asia', VN: 'asia', GE: 'asia', MA: 'africa', MX: 'americas' }

const tag = (text) => `#${normalize(text).replace(/ /g, '')}`
/** "Malta (St Julian’s)" → "#malta": the name people tag, not the resort in brackets. */
const placeTag = (name) => tag(name.replace(/\s*\(.*\)\s*/g, ' '))
const countryTag = (code, lang) =>
  `#${(lang === 'en' && COUNTRY_TAG[code]) || normalize(new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code).replace(/ /g, '')}`

// Words only one of the two languages uses (no "a", "in" or "no", which both do).
const STOPWORDS = {
  it: ['il', 'lo', 'la', 'di', 'che', 'e', 'per', 'con', 'una', 'un', 'non', 'dove', 'del', 'della', 'gli', 'le', 'si', 'al', 'alla', 'ai', 'voi', 'vi', 'chi', 'quale', 'tra', 'da', 'ma', 'piu', 'vostro', 'vostra', 'questo', 'questa', 'mese', 'mete', 'meta', 'ruota', 'gruppo', 'amici', 'qui', 'o'],
  en: ['the', 'and', 'of', 'to', 'with', 'for', 'where', 'is', 'you', 'your', 'one', 'are', 'which', 'this', 'who', 'what', 'it', 'wheel', 'friends', 'group', 'places', 'here', 'or', 'vs'],
}

const BANNED = /garantit|guaranteed|migliore al mondo|best in the world|imperdibil|must[- ]see|\bsconto|\bdiscount|gratis per sempre|free forever|clicca|click here|link in bio|https?:|www\./i

export const monthName = (month, lang) => new Intl.DateTimeFormat(lang, { month: 'long' }).format(new Date(2026, month - 1, 15))

const fill = (line, vars) => line.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')

// Letters that NFD doesn't split into a base letter and an accent.
const LETTERS = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ł: 'l', đ: 'd', ð: 'd', þ: 'th', ı: 'i' }

const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/[øæœßłđðþı]/g, (ch) => LETTERS[ch])
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
 * `allOrNone`: names it may mention only all together, so a four-place wheel isn't sold as "A or B?".
 */
export function checkLine(text, { min, max, lang, past, maxSimilarity, mustMention = [], allOrNone = [], allowedNumbers = [] }) {
  if (typeof text !== 'string') return 'missing'
  const t = text.trim()
  if (t.length < min || t.length > max) return `length ${t.length}`
  if (BANNED.test(t)) return 'banned wording'
  if (/[€$£%#@]/.test(t)) return 'prices, hashtags or handles'
  // Social captions show markdown as it is: *really* stays with its asterisks.
  if (/[*_~`]/.test(t)) return 'formatting'
  // Long dashes read as AI-written to many people: commas, colons and full stops instead.
  if (/[—–]/.test(t)) return 'dash'
  for (const n of t.match(/\d+/g) ?? []) if (!allowedNumbers.includes(n)) return `number ${n}`
  if ((t.match(/\p{Extended_Pictographic}/gu) ?? []).length > 1) return 'emoji'
  if (t === t.toUpperCase() && /[A-Z]/.test(t)) return 'shouting'
  if (!looksLike(t, lang)) return 'language'
  for (const name of mustMention) if (!normalize(t).includes(normalize(name))) return `doesn't mention ${name}`
  const named = allOrNone.filter((name) => normalize(t).includes(normalize(name))).length
  if (named && named < allOrNone.length) return 'names only some of the places'
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

/** The photo's credit: author (cut at a word, never mid-name) and licence. */
export function photoCredit(photo) {
  const author = photo.author.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  const short = author.length <= 40 ? author : author.slice(0, 40).replace(/[\s,;:–-]+\S*$/, '')
  return `${short || author.slice(0, 40)} (${photo.license})`
}

/**
 * Hashtags for a plan, at most 8, most specific first: the places, their countries, the guide's theme or the month,
 * the region when they share one, then two broad tags in rotation. All lowercase and deduplicated.
 */
const SIGN_TAGS = {
  it: ['#chatdigruppo', '#viaggiconamici', '#viaggiodigruppo', '#amici', '#relatable'],
  en: ['#groupchat', '#grouptrip', '#travelwithfriends', '#friendgroup', '#relatable'],
}

export function hashtags(plan, lang, rand) {
  const set = HASHTAGS[lang]
  // The signs carousel is about the group chat, not the places behind the signs.
  if (plan.format === 'signs') return [...SIGN_TAGS[lang], ...[...set.broad].sort(() => rand() - 0.5).slice(0, 3)].filter((t, i, all) => all.indexOf(t) === i).slice(0, 8)
  const places = plan.places.slice(0, 3).map((p) => placeTag(p.name[lang === 'it' ? 'it' : 'en']))
  const countries = [...new Set(plan.places.map((p) => p.countryCode))].slice(0, 2).map((code) => countryTag(code, lang))
  const theme = plan.guide ? (set.guide[plan.guide] ?? []) : plan.month ? [set.month(plan.month)] : []
  const moods = theme.length ? [] : [...new Set(plan.places.flatMap((p) => p.moods))].slice(0, 2).map((m) => set.mood[m])
  const regions = new Set(plan.places.map((p) => REGION[p.countryCode] ?? 'europe'))
  const region = regions.size === 1 ? [set.region[[...regions][0]]] : []
  const broad = [...set.broad].sort(() => rand() - 0.5).slice(0, 2)
  return [...new Set([...places, ...countries, ...theme, ...moods, ...region, ...broad].filter(Boolean))].slice(0, 8)
}

const MODELS = ['ministral-14b-2512', 'ministral-8b-2512']

/** Asks Mistral for a JSON answer; null without a key or when every model fails. */
export async function askMistral(messages, { maxTokens = 400 } = {}) {
  const key = process.env.MISTRAL_API_KEY
  if (!key) return null
  for (const model of MODELS) {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0.9, max_tokens: maxTokens, response_format: { type: 'json_object' } }),
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
  story: 'a short story: a group chat gets stuck because "{problem}", then the group decides with Roamie: each friend proposes a place, everyone votes with points and the wheel lands on {winner}',
  carousel_guide: 'a swipeable carousel: a cover, then {n} destinations for a "{theme}" group trip, one per slide, that people save for later',
  carousel_month: 'a swipeable carousel: {n} destinations at their best in {month}, one per slide, for a group of friends, that people save for later',
  carousel_signs: 'a swipeable carousel titled "{problem}": signs that a group trip is stuck in the group chat, one per slide, then how a group gets out of it with Roamie (everyone proposes, votes with points, the wheel decides); people send it to their friends',
}

/**
 * Hook and caption for a plan. `past` holds earlier posts' hooks and captions in this language.
 * Returns { hook, caption, source: 'ai' | 'pool', rejected: [reasons], hookStyle? }: the style (plan.hookStyle) only when
 * the AI's hook was accepted in it; a hand-written line has none, so it never counts towards a style's numbers.
 */
export async function writeCopy(plan, lang, past, rand, ask = askMistral, inspiration = []) {
  const names = plan.places.map((p) => p.name[lang])
  const vars = { month: plan.month ? monthName(plan.month, lang) : '', a: names[0], b: names[1], n: String(names.length), theme: plan.theme ?? '', problem: plan.problem ?? '', winner: names[plan.winner] ?? '' }
  const key = plan.kind === 'carousel' ? `carousel_${plan.format}` : plan.format
  const pool = POOLS[lang]
  // The signs carousel's title is hand-written (signs.mjs) and is the hook as it is: the AI only writes its caption,
  // about the signs, never about the places behind them.
  const signs = plan.format === 'signs'
  const allowedNumbers = [String(plan.places.length), ...(signs ? (`${plan.problem} ${plan.signLines.join(' ')}`.match(/\d+/g) ?? []) : [])]
  const mustMention = plan.format === 'versus' ? names : []
  const allOrNone = plan.format === 'versus' || signs ? [] : names
  const rejected = []
  const style = HOOK_STYLES[plan.hookStyle]

  const facts = signs ? plan.signLines.map((l) => `- ${l}`).join('\n') : plan.places.map((p) => `- ${p.name[lang]} (${p.country[lang]}): ${p.line[lang]}`).join('\n')
  const system = [
    `You write short-form social media copy for Roamie, a free web app where groups of friends propose destinations, vote with points and spin a wheel to decide their trip.`,
    `Write in ${lang === 'it' ? 'Italian, natural and informal (tu/voi), like a friend' : 'English, natural and informal, like a friend'}.`,
    `The ${plan.kind === 'carousel' ? 'post' : 'video'}: ${fill(FORMAT_BRIEF[key], vars)}.`,
    `Return JSON {"hook": string, "caption": string}.`,
    `hook: the first words on screen, 25–55 characters, makes people stop scrolling; ${style ? `write it as ${style.brief}, for example "${style.examples[lang]}" (a reference for the style, do not copy it)` : 'a question or a playful tension works'}. No emoji, no hashtags.${plan.format === 'versus' ? ' Name both destinations.' : signs ? ' Do not name any destination.' : ' Name all the destinations or none of them, never just some.'}`,
    `caption: two short sentences (80–220 characters), concrete, using only the facts given; end with a question to the viewer. No prices, no numbers, no links, no hashtags, no markdown (no asterisks or underscores), at most one emoji.`,
    `Never invent facts. Different every time: here are lines already used, do not repeat their wording or structure:`,
    ...past.slice(-12).map((l) => `  · ${l}`),
    `${style ? 'Lines this format used before, for the tone only (the hook follows its own style)' : 'Style examples'} (do not copy): ${pool[key].slice(0, 3).map((l) => `"${fill(l, vars)}"`).join(', ')}.`,
    // Openers from the week's research (research/insights.mjs): what groups really talk about, as inspiration only.
    ...(inspiration.length ? [`Tensions groups talk about lately, if one fits these destinations use it as inspiration for the hook (do not copy): ${inspiration.map((l) => `"${l}"`).join(', ')}.`] : []),
  ].join('\n')
  const user = signs ? `The signs, one per slide:\n${facts}` : `Destinations:\n${facts}${plan.month ? `\nMonth: ${vars.month}` : ''}`

  for (let attempt = 0; attempt < 3; attempt++) {
    const answer = await ask([
      { role: 'system', content: system },
      { role: 'user', content: rejected.length ? `${user}\n\nYour previous answer was rejected (${rejected.at(-1)}). Try again.` : user },
    ])
    if (!answer) break
    const hookProblem = signs ? null : (checkLine(answer.hook, { min: 20, max: 60, lang, past, maxSimilarity: 0.4, mustMention, allOrNone, allowedNumbers }) ?? style?.check?.(answer.hook) ?? null)
    const captionProblem = checkLine(answer.caption, { min: 60, max: 260, lang, past, maxSimilarity: 0.5, allowedNumbers })
    if (!hookProblem && !captionProblem) return { hook: signs ? plan.problem : answer.hook.trim(), caption: answer.caption.trim(), source: 'ai', rejected, ...(style && !signs && { hookStyle: plan.hookStyle }) }
    rejected.push(hookProblem ? `hook: ${hookProblem}` : `caption: ${captionProblem}`)
  }

  if (signs) return { hook: plan.problem, caption: lang === 'it' ? 'Quale di questi succede nella vostra chat di gruppo?' : 'Which of these happens in your group chat?', source: 'pool', rejected }
  const hook = pickFromPool(pool[key], vars, past, rand)
  const caption =
    lang === 'it'
      ? `${names.join(', ').replace(/, ([^,]*)$/, ' e $1')}: ${plan.format === 'versus' ? 'voi quale scegliete?' : 'quale proporreste al vostro gruppo?'}`
      : `${names.join(', ').replace(/, ([^,]*)$/, ' and $1')}: ${plan.format === 'versus' ? 'which one would you pick?' : 'which one would you put to your group?'}`
  return { hook, caption, source: 'pool', rejected }
}
