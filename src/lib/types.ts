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
  /** Set when the owner publishes the read-only page at /p/:slug */
  public_slug: string | null
  /** Period the group is considering (yyyy-mm-dd) and the trip's length in days */
  date_window_start: string | null
  date_window_end: string | null
  trip_length: number | null
  /** When the wheel spins by itself; set by owners and editors */
  roulette_spin_at: string | null
  /** Final dates, once fixed */
  start_date: string | null
  end_date: string | null
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

/** A member's final rating (1..5) of a visited destination. */
export interface ReviewSummary {
  id: string
  user_id: string
  rating: number
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
  /** ISO 3166-1 alpha-2, from the place search */
  country_code: string | null
  visited_at: string | null
  reviews: ReviewSummary[]
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
  place_name: string | null
  lat: number | null
  lng: number | null
}

export interface ItineraryDay {
  id: string
  trip_id: string
  day_number: number
  date: string | null
  title: string | null
  itinerary_items: ItineraryItem[]
}

/** A place the user visited outside Roamie's trips; private to them. */
export interface VisitedPlace {
  id: string
  user_id: string
  name: string
  country: string | null
  country_code: string | null
  lat: number | null
  lng: number | null
  /** yyyy-mm-dd */
  visited_on: string | null
  rating: number | null
  created_at: string
}

/** get_public_trip: what anyone with the link sees (no people, votes by member or comments). */
export interface PublicTrip {
  slug: string
  name: string
  description: string | null
  cover_image_url: string | null
  cover_image_attribution: string | null
  destinations: (Pick<
    Destination,
    'id' | 'name' | 'country' | 'country_code' | 'lat' | 'lng' | 'image_url' | 'image_attribution' | 'mood' | 'budget_level' | 'status'
  > & { points: number })[]
  days: {
    day_number: number
    date: string | null
    title: string | null
    items: Pick<ItineraryItem, 'time' | 'title' | 'description' | 'place_name' | 'lat' | 'lng'>[]
  }[]
}

export interface TripPreview {
  id: string
  name: string
  cover_image_url: string | null
  cover_image_attribution: string | null
  member_count: number
  is_member: boolean
}

export const LINK_CATEGORIES = ['flight', 'stay', 'ticket', 'transport', 'other'] as const
export type LinkCategory = (typeof LINK_CATEGORIES)[number]

export interface TripLink {
  id: string
  trip_id: string
  category: LinkCategory
  title: string
  url: string | null
  note: string | null
  created_by: string | null
  created_at: string
}

export const CHECKLIST_KINDS = ['book', 'pack'] as const
export type ChecklistKind = (typeof CHECKLIST_KINDS)[number]

export interface ChecklistItem {
  id: string
  trip_id: string
  kind: ChecklistKind
  title: string
  assignee_id: string | null
  done: boolean
  done_at: string | null
  created_by: string | null
  created_at: string
}

/** Stored as JSON in image_attribution / cover_image_attribution. */
export interface ImageAttribution {
  author: string
  license: string
  licenseUrl?: string
  sourceUrl: string
}
