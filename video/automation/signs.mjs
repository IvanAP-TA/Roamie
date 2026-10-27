/**
 * The "signs" carousel: the problem Roamie solves, told as a list people recognise themselves in ("5 signs your trip
 * will never leave the group chat"), one sign per slide over a place's photo, then how a group gets out of it.
 *
 * Hand-written on purpose, like the story scenarios (stories.mjs): a sign never says anything about the place behind it,
 * and the way out (`fix`) is only what the app really does. The AI writes the caption only; the title is the hook.
 */

export const SIGN_LISTS = {
  'never-leaves-chat': {
    title: { it: '5 segnali che il viaggio non uscirà mai dalla chat', en: '5 signs your trip will never leave the group chat' },
    signs: {
      it: ['Tutti dicono "io ci sto", nessuno dice dove', 'La stessa domanda torna ogni domenica', 'Le idee migliori sono sepolte 300 messaggi sopra', 'Chi organizza fa tutto da solo', 'Il sondaggio ha 2 voti su 7'],
      en: ['Everyone says "I\'m in", nobody says where', 'The same question comes back every Sunday', 'The best idea is buried 300 messages up', 'The organiser does everything alone', 'The poll has 2 votes out of 7'],
    },
    fix: { it: 'Una lista sola, dieci punti a testa, la ruota decide.', en: 'One list, ten points each, the wheel decides.' },
  },
  'quiet-friend': {
    title: { it: '5 cose che pensa l\'amico che non dice mai la sua', en: '5 things the quiet friend in the group chat is thinking' },
    signs: {
      it: ['"Va bene tutto" non è vero', 'Ha un posto in mente da mesi', 'Non vuole sembrare quello che rovina i piani', 'Il budget è un problema, ma non lo dirà', 'Voterebbe, se nessuno vedesse il voto'],
      en: ['"Anything works" isn\'t true', 'They\'ve had a place in mind for months', 'They don\'t want to be the one who ruins the plan', 'Money is an issue, they just won\'t say it', 'They\'d vote, if nobody saw the vote'],
    },
    fix: { it: 'Voto segreto e budget segreto: ognuno dice la sua, senza imbarazzi.', en: 'Secret voting and a secret budget: everyone has a say, nobody feels awkward.' },
  },
  'dates-chaos': {
    title: { it: '5 fasi di un gruppo che cerca le date per partire', en: '5 stages of a group trying to pick dates' },
    signs: {
      it: ['"Facciamo a maggio?"', 'Tre persone su sette rispondono', 'Qualcuno ha già un matrimonio quel weekend', 'Si riparte da capo con giugno', 'Si arriva a luglio senza aver prenotato'],
      en: ['"How about May?"', 'Three people out of seven reply', 'Someone already has a wedding that weekend', 'Back to square one with June', 'It\'s July and nothing is booked'],
    },
    fix: { it: 'Ognuno segna i giorni liberi, Roamie trova il periodo che va bene a tutti.', en: 'Everyone marks their free days, Roamie finds the window that works for all.' },
  },
  'loudest-voice': {
    title: { it: '5 modi in cui il più rumoroso sceglie per tutti', en: '5 ways the loudest friend picks the trip for everyone' },
    signs: {
      it: ['Scrive per primo, scrive di più', 'Manda dieci foto della sua meta preferita', 'Le altre proposte "non sono male, però…"', 'Chiude con "allora è deciso?"', 'Nessuno ha detto di sì, nessuno ha detto di no'],
      en: ['They post first and post most', 'They send ten photos of their favourite place', 'Every other idea is "not bad, but…"', 'They close with "so it\'s decided?"', 'Nobody said yes, nobody said no'],
    },
    fix: { it: 'Dieci punti a testa: ogni voto pesa uguale, anche quello di chi scrive poco.', en: 'Ten points each: every vote weighs the same, even from the friend who barely texts.' },
  },
}

/** Signs carousels look this far back to avoid repeating a list. */
export const SIGN_MEMORY = 3

/** A list not used by the last few signs carousels (`history`: that language's posts), least recently used first. */
export function pickSignList(history, rand) {
  const used = history.filter((h) => h.format === 'signs').map((h) => h.signs)
  const lastUse = (id) => used.lastIndexOf(id)
  const ids = Object.keys(SIGN_LISTS)
  const fresh = ids.filter((id) => !used.slice(-SIGN_MEMORY).includes(id))
  const pool = fresh.length ? fresh : ids
  const oldest = Math.min(...pool.map(lastUse))
  const choices = pool.filter((id) => lastUse(id) === oldest)
  return choices[Math.floor(rand() * choices.length)]
}

/** A list's texts in a language. */
export function signTexts(id, lang) {
  const list = SIGN_LISTS[id]
  return { title: list.title[lang], signs: list.signs[lang], fix: list.fix[lang] }
}
