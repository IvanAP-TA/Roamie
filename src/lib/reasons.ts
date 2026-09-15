import type { ReasonSummary } from './types'

/** Also enforced by the database. */
export const REASONS_PER_MEMBER = 3
export const REASON_MAX_LENGTH = 120

/**
 * Most liked first, then in writing order. During a secret vote only writing order: likes are hidden, and an order
 * built on them would give the votes away.
 */
export function sortReasons(reasons: ReasonSummary[], votesHidden: boolean): ReasonSummary[] {
  return [...reasons].sort((a, b) => (votesHidden ? 0 : b.likes.length - a.likes.length) || a.created_at.localeCompare(b.created_at))
}
