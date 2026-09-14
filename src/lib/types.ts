export type Role = 'owner' | 'editor' | 'viewer'
export type DestinationStatus = 'proposed' | 'selected' | 'visited'
/** Points each member can spread across a trip's proposed destinations (enforced in SQL). */
export const POINTS_BUDGET = 10

export const MOODS = ['adventure', 'relax', 'nightlife', 'culture', 'nature', 'food_wine', 'family', 'romantic'] as const
export type Mood = (typeof MOODS)[number]

export type BudgetLevel = 1 | 2 | 3

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export type ProfileSummary = Pick<Profile, 'display_name' | 'avatar_url'>

export interface Trip {
  id: string
  owner_id: string
  name: string
  description: string | null
  cover_image_url: string | null
  cover_image_attribution: string | null
  invite_code: string
  created_at: string
}

export interface TripMember {
  id: string
  trip_id: string
  user_id: string
  role: Role
  joined_at: string
  profile: ProfileSummary | null
}

export interface TripListItem extends Trip {
  trip_members: TripMember[]
  destinations: { count: number }[]
}

export interface VoteSummary {
  id: string
  user_id: string
  points: number
}

export interface Destination {
  id: string
  trip_id: string
  name: string
  country: string | null
  lat: number | null
  lng: number | null
  image_url: string | null
  image_attribution: string | null
  mood: Mood[]
  budget_level: BudgetLevel | null
  expectations: string | null
  status: DestinationStatus
  selected_at: string | null
  created_by: string | null
  created_at: string
  votes: VoteSummary[]
  comments: { count: number }[]
  creator: ProfileSummary | null
}

export interface DestinationComment {
  id: string
  destination_id: string
  user_id: string
  content: string
  created_at: string
  author: ProfileSummary | null
}

export interface ItineraryItem {
  id: string
  itinerary_day_id: string
  time: string | null
  title: string
  description: string | null
  order_index: number
}

export interface ItineraryDay {
  id: string
  trip_id: string
  day_number: number
  date: string | null
  title: string | null
  itinerary_items: ItineraryItem[]
}

export interface TripPreview {
  id: string
  name: string
  cover_image_url: string | null
  cover_image_attribution: string | null
  member_count: number
  is_member: boolean
}

/** Stored as JSON in image_attribution / cover_image_attribution. */
export interface ImageAttribution {
  author: string
  license: string
  licenseUrl?: string
  sourceUrl: string
}
