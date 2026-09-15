import type { Trip } from './types'

/** While a secret round is on, members see only their own points (the database enforces it). */
export const votesHidden = (trip: Pick<Trip, 'secret_voting' | 'votes_revealed_at'>) => trip.secret_voting && !trip.votes_revealed_at
