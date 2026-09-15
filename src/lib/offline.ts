import type { Query } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { createStore, del, get, set } from 'idb-keyval'

/**
 * Offline trips: the query cache is saved in IndexedDB, so a trip opened once stays readable without a
 * connection (itinerary, checklist, links, dates…). It's cleared on sign-out and when another
 * account signs in on the same device.
 */

/**
 * Also used as the queries' gcTime, which TanStack Query schedules with setTimeout: browsers store the delay
 * as a 32-bit integer, so anything above ~24.8 days overflows and fires at once, dropping every inactive
 * query immediately. 20 days stays safely below.
 */
export const OFFLINE_MAX_AGE = 20 * 24 * 60 * 60 * 1000

/** Bump when the shape of cached data changes, so old copies are discarded. */
export const CACHE_BUSTER = 'roamie-1'

const PERSISTED_ROOTS = new Set(['trips', 'trip', 'profile', 'passport', 'comments'])

const store = typeof indexedDB !== 'undefined' ? createStore('roamie', 'query-cache') : undefined

export const offlinePersister = createAsyncStoragePersister({
  storage: store
    ? {
        getItem: (key) => get<string>(key, store),
        setItem: (key, value: string) => set(key, value, store),
        removeItem: (key) => del(key, store),
      }
    : undefined,
  key: 'roamie.queries',
  throttleTime: 1000,
})

/**
 * Only the signed-in user's trip data: not public pages or the climate (it has its own cache). Any query
 * holding data is kept, even if its last refresh failed: a server hiccup mustn't drop a trip from the device.
 */
export const shouldPersistQuery = (query: Pick<Query, 'queryKey' | 'state'>) =>
  query.state.data !== undefined && PERSISTED_ROOTS.has(String(query.queryKey[0]))

export async function clearOfflineCache() {
  try {
    await offlinePersister.removeClient()
  } catch {
    // IndexedDB unavailable (private mode): nothing was saved.
  }
}
