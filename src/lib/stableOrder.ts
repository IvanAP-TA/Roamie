/**
 * Puts `items` in the order they were last shown (`previousIds`), so fresh data doesn't reshuffle a list the user is
 * interacting with. Items that weren't shown before come first, in their given order; items gone are dropped.
 */
export function keepOrder<T extends { id: string }>(items: T[], previousIds: string[]): T[] {
  const rank = new Map(previousIds.map((id, index) => [id, index]))
  return [
    ...items.filter((item) => !rank.has(item.id)),
    ...items.filter((item) => rank.has(item.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!),
  ]
}
