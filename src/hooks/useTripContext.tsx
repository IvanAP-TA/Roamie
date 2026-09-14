import { createContext, useContext } from 'react'
import type { Role, Trip, TripMember } from '@/lib/types'

export interface TripContextValue {
  trip: Trip
  members: TripMember[]
  me: TripMember | null
  role: Role | null
  isOwner: boolean
  canEdit: boolean
}

export const TripContext = createContext<TripContextValue | null>(null)

export function useTripContext() {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTripContext must be used inside a trip route')
  return ctx
}
