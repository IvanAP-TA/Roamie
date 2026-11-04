import { describe, expect, it } from 'vitest'
import { activitiesUrl, flightsUrl, staysUrl, usesTripCom } from './booking'

const lisbon = { name: 'Lisbona', country: 'Portogallo', countryCode: 'PT' }
const shanghai = { name: 'Shanghai', country: 'Cina', countryCode: 'cn' }

describe('booking links', () => {
  it('fills the flight search with where you leave from and the trip dates', () => {
    const url = new URL(flightsUrl(lisbon, ' Milano ', { start: '2027-05-01', end: '2027-05-05' }, 'it'))
    expect(url.hostname).toBe('www.google.com')
    expect(url.searchParams.get('q')).toBe('Flights to Lisbona, Portogallo from Milano on 2027-05-01 through 2027-05-05')
    expect(url.searchParams.get('hl')).toBe('it')
    expect(new URL(flightsUrl(lisbon, 'Milano')).searchParams.get('q')).toBe('Flights to Lisbona, Portogallo from Milano')
  })

  it('searches Booking for the dates and the group, a room every four people', () => {
    const url = new URL(staysUrl(lisbon, { start: '2027-05-01', end: '2027-05-05', people: 6 }, 'it'))
    expect(url.hostname).toBe('www.booking.com')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ ss: 'Lisbona, Portogallo', checkin: '2027-05-01', checkout: '2027-05-05', group_adults: '6', no_rooms: '2', lang: 'it' })
    // Dates the wrong way round, or only a start: no dates rather than a broken search.
    expect(new URL(staysUrl(lisbon, { start: '2027-05-05', end: '2027-05-01' })).searchParams.has('checkin')).toBe(false)
  })

  it('sends China to Trip.com, where Booking has little', () => {
    expect(usesTripCom(shanghai)).toBe(true)
    expect(usesTripCom(lisbon)).toBe(false)
    expect(new URL(staysUrl(shanghai)).hostname).toBe('www.trip.com')
    expect(new URL(activitiesUrl(shanghai)).searchParams.get('keyword')).toBe('Shanghai')
    expect(new URL(activitiesUrl(lisbon)).hostname).toBe('www.viator.com')
  })
})
