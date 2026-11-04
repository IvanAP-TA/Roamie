/**
 * "Book it" links: each opens a partner's own search already filled in (place, dates, people, where you leave from),
 * in a new tab. Plain links, no partner scripts or widgets: nothing about the user reaches a partner until they tap.
 * All the URLs are built here, so affiliate ids can be added in one place once Roamie has them (Backlog: monetisation).
 */

export interface BookingPlace {
  name: string
  country?: string | null
  /** ISO 3166-1 alpha-2 */
  countryCode?: string | null
}

export interface BookingTrip {
  /** YYYY-MM-DD */
  start?: string | null
  end?: string | null
  people?: number
}

/** Where Booking.com has little and Trip.com is how people book (mainland China, Hong Kong, Macau). */
const TRIP_COM = new Set(['CN', 'HK', 'MO'])

export const usesTripCom = (place: BookingPlace) => TRIP_COM.has((place.countryCode ?? '').toUpperCase())

const where = (place: BookingPlace) => (place.country ? `${place.name}, ${place.country}` : place.name)
const tripComSearch = (place: BookingPlace) => `https://www.trip.com/global-search/searchlist/search?keyword=${encodeURIComponent(place.name)}`

/** Google Flights from a city to the place, on the trip's dates when the group has fixed them. */
export function flightsUrl(place: BookingPlace, from: string, trip: BookingTrip = {}, lang = 'en'): string {
  const dates = trip.start ? ` on ${trip.start}${trip.end && trip.end !== trip.start ? ` through ${trip.end}` : ''}` : ''
  const q = `Flights to ${where(place)} from ${from.trim()}${dates}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}&hl=${lang}`
}

/** Booking.com for the place (Trip.com where Booking has little), for the group's dates and size. */
export function staysUrl(place: BookingPlace, trip: BookingTrip = {}, lang = 'en'): string {
  if (usesTripCom(place)) return tripComSearch(place)
  const params = new URLSearchParams({ ss: where(place), lang })
  if (trip.start && trip.end && trip.end > trip.start) {
    params.set('checkin', trip.start)
    params.set('checkout', trip.end)
  }
  if (trip.people && trip.people > 0) {
    params.set('group_adults', String(Math.min(trip.people, 30)))
    params.set('no_rooms', String(Math.max(1, Math.ceil(trip.people / 4))))
  }
  return `https://www.booking.com/searchresults.html?${params}`
}

/** Tours and tickets: Viator (Trip.com where Booking has little). */
export function activitiesUrl(place: BookingPlace): string {
  if (usesTripCom(place)) return tripComSearch(place)
  return `https://www.viator.com/searchResults/all?text=${encodeURIComponent(place.name)}`
}
