/** The Monday report's text (report.mjs), from public.funnel_report()'s numbers: counts only. */
const pct = (part, whole) => (whole ? `${Math.round((100 * part) / whole)}%` : '–')

/** Telegram HTML. */
export function reportMessage({ week, cohort, total }) {
  return [
    '📊 <b>Roamie, la settimana</b>',
    '',
    `<b>Stella polare</b>: ${cohort.north_star} viaggi su ${cohort.trips} (${pct(cohort.north_star, cohort.trips)}) con 3+ persone e una meta scelta`,
    '<i>viaggi veri creati negli ultimi 28 giorni</i>',
    '',
    '<b>Dove si perdono i viaggi</b>',
    `• creati: ${cohort.trips}`,
    `• con 2+ persone: ${cohort.two_members} (${pct(cohort.two_members, cohort.trips)})`,
    `• con 3+ persone: ${cohort.three_members} (${pct(cohort.three_members, cohort.trips)})`,
    `• votati da 2+ persone: ${cohort.two_voters} (${pct(cohort.two_voters, cohort.trips)})`,
    `• con una meta scelta: ${cohort.decided} (${pct(cohort.decided, cohort.trips)})`,
    '',
    '<b>Ultimi 7 giorni</b>',
    `• nuovi account Google: ${week.google_users} · ospiti: ${week.guests}`,
    `• viaggi creati: ${week.trips} · amici entrati da un invito: ${week.joins}`,
    `• mete proposte: ${week.proposals} · voti: ${week.votes} · ruote girate: ${week.spins}`,
    '',
    `In tutto: ${total.users} account, ${total.trips} viaggi veri.`,
  ].join('\n')
}
