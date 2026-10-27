/**
 * The "story" video's scenarios: a group chat stuck on one of the problems people really talk about when they plan a
 * trip together (the weekly research, research/insights.mjs, is where they come from), then what Roamie changes.
 *
 * Hand-written on purpose: the chat is a scene, not a fact, but it never says anything about a place beyond its name
 * ({a}, {b}: two of the video's places), and each `fix` is something the app really does (points to share, secret
 * voting, one list of proposals). The AI only writes the hook and the caption, as for every format.
 */

const PEOPLE = { it: ['Giulia', 'Marco', 'Sara', 'Luca'], en: ['Emma', 'Jake', 'Sophie', 'Liam'] }

export const SCENARIOS = {
  'never-decides': {
    problem: { it: 'La chat del gruppo non decide mai', en: 'The group chat never decides' },
    chat: {
      it: ['Allora, dove andiamo?', '{a}!!', 'Oppure {b}?', 'Boh, decidete voi', '…ne riparliamo domani?'],
      en: ['So where are we going?', '{a}!!', 'Or {b}?', 'Idk, you guys decide', '…talk about it tomorrow?'],
    },
    fix: { it: ['Ognuno propone.', 'Tutti votano.'], en: ['Everyone proposes.', 'Everyone votes.'] },
  },
  hype: {
    problem: { it: 'Non tutti sono gasati allo stesso modo', en: 'Not everyone is equally hyped' },
    chat: {
      it: ['Viaggio il mese prossimo? Io ci sto!!', 'Forse {a}', 'Va bene tutto', '👍', '…quindi chi vota davvero?'],
      en: ['Trip next month? I’m so in!!', 'Maybe {a}', 'Anything works', '👍', '…so who’s actually voting?'],
    },
    fix: { it: ['Dieci punti a testa.', 'Si vede chi ci tiene.'], en: ['Ten points each.', 'You see who really cares.'] },
  },
  'no-one-says-no': {
    problem: { it: 'Nessuno ha il coraggio di dire di no', en: 'Nobody wants to be the one who says no' },
    chat: {
      it: ['Allora {a}?', 'Sì dai', 'Per me va bene… credo', 'Come volete voi', '…ma a qualcuno piace davvero?'],
      en: ['So {a} it is?', 'Yeah sure', 'Fine by me… I guess', 'Whatever you want', '…does anyone actually want it?'],
    },
    fix: { it: ['Voto segreto.', 'Risposte sincere.'], en: ['Secret voting.', 'Honest answers.'] },
  },
  buried: {
    problem: { it: 'Il piano è sepolto sotto mille messaggi', en: 'The plan got buried in the chat' },
    chat: {
      it: ['Aspetta, cosa avevamo scelto?', 'Scorri su', 'Qualcuno aveva detto {b}?', 'Quello era la settimana scorsa', '…ok, ricominciamo'],
      en: ['Wait, what did we pick?', 'Scroll up', 'Someone said {b}?', 'That was last week', '…ok, starting over'],
    },
    fix: { it: ['Una lista sola,', 'non mille messaggi.'], en: ['One shared list,', 'not a thousand messages.'] },
  },
  vibes: {
    problem: { it: 'Metà vuole festa, metà vuole riposo', en: 'Half want to party, half want to rest' },
    chat: {
      it: ['Voglio uscire tutte le sere!', 'Io voglio solo un libro e il sole', 'E se facessimo {a}?', 'A me basta mangiare bene', '…quindi nessuno è d’accordo'],
      en: ['I want to go out every night!', 'I just want sun and a book', 'What about {a}?', 'I just want good food', '…so nobody agrees'],
    },
    fix: { it: ['Punti, non discussioni.', 'Conta ogni voglia.'], en: ['Points, not arguments.', 'Every vibe counts.'] },
  },
  money: {
    problem: { it: 'Nessuno vuole dire che costa troppo', en: 'Nobody wants to say it’s too expensive' },
    chat: {
      it: ['{a} sembra pazzesca', 'Siii', 'Mmh, vediamo', 'Io devo guardare i conti…', '…qualcuno vuole dire qualcosa?'],
      en: ['{a} looks amazing', 'Yesss', 'Hmm, let’s see', 'I need to check my budget…', '…anyone want to say something?'],
    },
    fix: { it: ['Voto segreto.', 'Niente imbarazzi sui soldi.'], en: ['Secret voting.', 'No awkward money talk.'] },
  },
  dates: {
    problem: { it: 'Nessuno riesce a trovare le date', en: 'Nobody can agree on the dates' },
    chat: {
      it: ['Partiamo a maggio?', 'Io posso solo a giugno', 'A giugno ho gli esami', '{a} a luglio allora?', '…quindi mai?'],
      en: ['Trip in May?', 'I can only do June', 'June is exams for me', '{a} in July then?', '…so never?'],
    },
    fix: { it: ['Ognuno segna i giorni liberi.', 'Roamie trova il periodo.'], en: ['Everyone marks their free days.', 'Roamie finds the window.'] },
  },
  organiser: {
    problem: { it: 'Una persona sola organizza tutto', en: 'One person ends up organising everything' },
    chat: {
      it: ['Ho fatto una lista di posti', '{a} sembra bella', '👍', 'Scegli tu, ci sai fare', '…perché tocca sempre a me?'],
      en: ['I made a list of places', '{a} looks cool', '👍', 'You pick, you’re good at this', '…why is it always me?'],
    },
    fix: { it: ['Ognuno propone.', 'Decide il gruppo.'], en: ['Everyone proposes.', 'The group decides.'] },
  },
  loudest: {
    problem: { it: 'Sceglie sempre chi scrive di più', en: 'The loudest friend always picks' },
    chat: {
      it: ['{a}. Fidatevi.', 'Io pensavo a {b}…', '{a} è meglio, ho visto i video', 'ok…', '…abbiamo appena deciso {a}?'],
      en: ['{a}. Trust me.', 'I was thinking {b}…', '{a} is better, I’ve seen videos', 'ok…', '…did we just agree to {a}?'],
    },
    fix: { it: ['Dieci punti a testa.', 'Ogni voto pesa uguale.'], en: ['Ten points each.', 'Every vote weighs the same.'] },
  },
  ghosted: {
    problem: { it: 'Metà gruppo ha smesso di rispondere', en: 'Half the group stopped replying' },
    chat: {
      it: ['Chi viene a {a}?', 'Io!', '…', 'Ci siete??', '…c’è ancora qualcuno?'],
      en: ['Who’s in for {a}?', 'Me!', '…', 'Hello??', '…is anyone still here?'],
    },
    fix: { it: ['Un link, si entra col nome.', 'Si vota in un minuto.'], en: ['One link, join with a name.', 'Everyone votes in a minute.'] },
  },
}

/** Story posts look this far back to avoid repeating a scenario. */
export const SCENARIO_MEMORY = 6

/** A scenario not used by the last few story posts (`history`: that language's posts), least recently used first. */
export function pickScenario(history, rand) {
  const used = history.filter((h) => h.format === 'story').map((h) => h.scenario)
  const lastUse = (id) => used.lastIndexOf(id)
  const ids = Object.keys(SCENARIOS)
  const fresh = ids.filter((id) => !used.slice(-SCENARIO_MEMORY).includes(id))
  const pool = fresh.length ? fresh : ids
  const oldest = Math.min(...pool.map(lastUse))
  const choices = pool.filter((id) => lastUse(id) === oldest)
  return choices[Math.floor(rand() * choices.length)]
}

/** The scenario's texts in a language, with the places' names filled in; the last message is the viewer's own. */
export function storyTexts(id, lang, names) {
  const scenario = SCENARIOS[id]
  const fill = (line) => line.replace('{a}', names[0]).replace('{b}', names[1])
  const people = [...PEOPLE[lang], lang === 'it' ? 'Tu' : 'You']
  return {
    problem: scenario.problem[lang],
    chat: scenario.chat[lang].map((text, i) => ({ who: people[i], text: fill(text) })),
    fix: scenario.fix[lang],
    // Who proposed each place: three of the friends in the chat.
    by: PEOPLE[lang].slice(0, 3),
  }
}
