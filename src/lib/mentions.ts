/**
 * Mentions in comments. A member is written as <@user-id>, so the mention survives renames and people sharing a name,
 * and is shown with their current name; @all is plain text and reaches the whole group. The database reads the same
 * tokens to decide who gets notified (see comment_mentions in SQL).
 */

const USER_ID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const TOKENS = new RegExp(`<@(${USER_ID})>|(^|[^\\p{L}\\p{N}_])@all(?![\\p{L}\\p{N}_])`, 'giu')

export type CommentPart = { type: 'text'; text: string } | { type: 'user'; userId: string } | { type: 'all' }

export interface PickedMention {
  id: string
  label: string
}

export function parseComment(content: string): CommentPart[] {
  const parts: CommentPart[] = []
  let last = 0
  for (const match of content.matchAll(TOKENS)) {
    // @all's match includes the character before it, which stays text.
    const start = match.index + (match[2] ?? '').length
    if (start > last) parts.push({ type: 'text', text: content.slice(last, start) })
    parts.push(match[1] ? { type: 'user', userId: match[1].toLowerCase() } : { type: 'all' })
    last = match.index + match[0].length
  }
  if (last < content.length) parts.push({ type: 'text', text: content.slice(last) })
  return parts
}

export const mentionsUser = (content: string, userId: string) =>
  parseComment(content).some((part) => part.type === 'all' || (part.type === 'user' && part.userId === userId))

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Turns the "@Name" picked from the suggestions into tokens; longer names first, so "@Anna Maria" wins over "@Anna". */
export function encodeMentions(text: string, picked: PickedMention[]): string {
  return [...picked]
    .sort((a, b) => b.label.length - a.label.length)
    .reduce((out, { id, label }) => out.replace(new RegExp(`@${escapeRegExp(label)}(?![\\p{L}\\p{N}_])`, 'gu'), `<@${id}>`), text)
}

/** The "@query" being typed right before the caret, if any. */
export function mentionQuery(text: string, caret: number): { start: number; end: number; text: string } | null {
  const match = /(^|\s)@([\p{L}\p{N}_.'-]{0,30})$/u.exec(text.slice(0, caret))
  if (!match) return null
  return { start: match.index + match[1].length, end: caret, text: match[2] }
}

const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** "@ma" suggests Marco Bianchi and Anna Maria: any word of the name starting with what was typed. */
export function matchesMention(label: string, query: string): boolean {
  const q = fold(query)
  return fold(label).startsWith(q) || fold(label).split(/\s+/).some((word) => word.startsWith(q))
}
