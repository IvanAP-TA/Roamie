import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { persistQueryClientRestore, persistQueryClientSave } from '@tanstack/react-query-persist-client'
import { CACHE_BUSTER, OFFLINE_MAX_AGE, shouldPersistQuery } from './offline'

type PersistableQuery = Parameters<typeof shouldPersistQuery>[0]

const query = (queryKey: unknown[], state: { data?: unknown; status?: 'success' | 'error' | 'pending' } = {}) =>
  ({ queryKey, state: { status: state.status ?? 'success', data: 'data' in state ? state.data : [{ id: 'x' }] } }) as unknown as PersistableQuery

describe('shouldPersistQuery', () => {
  it("keeps the user's trips and every trip's data on the device", () => {
    for (const key of [['trips'], ['trip', 't1'], ['trip', 't1', 'itinerary'], ['trip', 't1', 'links'], ['passport', 'u1', 'places']]) {
      expect(shouldPersistQuery(query(key))).toBe(true)
    }
  })

  it('keeps saved data when its last refresh failed', () => {
    expect(shouldPersistQuery(query(['trip', 't1', 'links'], { status: 'error' }))).toBe(true)
  })

  it('skips public data, other caches and queries without data', () => {
    expect(shouldPersistQuery(query(['public-trip', 'slug']))).toBe(false)
    expect(shouldPersistQuery(query(['climate', 1, 2]))).toBe(false)
    expect(shouldPersistQuery(query(['trips'], { data: undefined, status: 'pending' }))).toBe(false)
    expect(shouldPersistQuery(query(['trip', 't1', 'links'], { data: undefined, status: 'error' }))).toBe(false)
  })
})

describe('offline copy', () => {
  it('keeps the cache lifetime within the 32-bit setTimeout limit', () => {
    // Above it the garbage collection timer fires immediately and inactive queries vanish.
    expect(OFFLINE_MAX_AGE).toBeLessThanOrEqual(2 ** 31 - 1)
  })

  it('saves trip data and restores it into a fresh app, leaving other data out', async () => {
    const memory = new Map<string, string>()
    const persister = createAsyncStoragePersister({
      storage: {
        getItem: async (key) => memory.get(key) ?? null,
        setItem: async (key, value: string) => void memory.set(key, value),
        removeItem: async (key) => void memory.delete(key),
      },
      key: 'roamie.queries',
      throttleTime: 0,
    })
    const options = { persister, buster: CACHE_BUSTER, maxAge: OFFLINE_MAX_AGE }

    const online = new QueryClient()
    online.setQueryData(['trip', 't1', 'itinerary'], [{ id: 'day-1', title: 'Arrivo' }])
    online.setQueryData(['public-trip', 'lisbona'], { name: 'Lisbona' })
    await persistQueryClientSave({ queryClient: online, ...options, dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery } })

    const offline = new QueryClient()
    await persistQueryClientRestore({ queryClient: offline, ...options })
    expect(offline.getQueryData(['trip', 't1', 'itinerary'])).toEqual([{ id: 'day-1', title: 'Arrivo' }])
    expect(offline.getQueryData(['public-trip', 'lisbona'])).toBeUndefined()

    // A copy from an older app version is discarded instead of restored.
    const upgraded = new QueryClient()
    await persistQueryClientRestore({ queryClient: upgraded, ...options, buster: 'roamie-next' })
    expect(upgraded.getQueryData(['trip', 't1', 'itinerary'])).toBeUndefined()
  })
})
