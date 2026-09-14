interface Entry<T> {
  v: T
  t: number
}

/**
 * Tiny LRU cache persisted in localStorage. Used to avoid repeating requests to the
 * free public APIs (Nominatim, Wikimedia) — part of respecting their usage policies.
 */
export function createLocalCache<T>(name: string, { max = 100, ttlMs = 7 * 24 * 60 * 60 * 1000 } = {}) {
  const storageKey = `roamie.cache.${name}`
  let map: Map<string, Entry<T>> | null = null

  const load = () => {
    if (map) return map
    try {
      map = new Map(JSON.parse(localStorage.getItem(storageKey) ?? '[]') as [string, Entry<T>][])
    } catch {
      map = new Map()
    }
    return map
  }

  const persist = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...load()]))
    } catch {
      // storage full or unavailable (private mode): the in-memory map still works
    }
  }

  return {
    get(key: string): T | undefined {
      const m = load()
      const entry = m.get(key)
      if (!entry) return undefined
      if (Date.now() - entry.t > ttlMs) {
        m.delete(key)
        return undefined
      }
      m.delete(key)
      m.set(key, entry)
      return entry.v
    },
    set(key: string, value: T) {
      const m = load()
      m.delete(key)
      m.set(key, { v: value, t: Date.now() })
      while (m.size > max) m.delete(m.keys().next().value as string)
      persist()
    },
  }
}
