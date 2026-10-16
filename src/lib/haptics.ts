/**
 * A light vibration for the moments that deserve one (Android; iPhones and computers ignore it). Kept short: the
 * point is to confirm a tap, not to buzz.
 */
const PATTERNS = {
  /** A small step: a point, a like */
  tap: 8,
  /** Something done: a checklist item ticked */
  success: 14,
  /** The big moment: the wheel's result */
  celebrate: [30, 60, 30],
} satisfies Record<string, number | number[]>

export function haptic(kind: keyof typeof PATTERNS) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(PATTERNS[kind])
}
