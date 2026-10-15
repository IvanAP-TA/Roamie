import { startTransition, useEffect, useRef, useState, type ReactNode } from 'react'
import { IsRestoringProvider, QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
  type PersistQueryClientProviderProps,
} from '@tanstack/react-query-persist-client'

/**
 * TanStack's PersistQueryClientProvider (the offline copy of the app's data: restored from the device on start, saved
 * on change), with one difference: the end of the restore re-renders as a transition. Restoring takes a moment, and
 * while React adopts a prerendered page an urgent update would make it finish that in one long task.
 */
export function OfflineCacheProvider({
  client,
  persistOptions,
  children,
}: {
  client: QueryClient
  persistOptions: PersistQueryClientProviderProps['persistOptions']
  children: ReactNode
}) {
  const [isRestoring, setIsRestoring] = useState(true)
  const options = useRef(persistOptions)
  const didRestore = useRef(false)

  useEffect(() => {
    const persist = { ...options.current, queryClient: client }
    if (!didRestore.current) {
      didRestore.current = true
      void persistQueryClientRestore(persist)
        .catch(() => {})
        .finally(() => startTransition(() => setIsRestoring(false)))
    }
    return isRestoring ? undefined : persistQueryClientSubscribe(persist)
  }, [client, isRestoring])

  return (
    <QueryClientProvider client={client}>
      <IsRestoringProvider value={isRestoring}>{children}</IsRestoringProvider>
    </QueryClientProvider>
  )
}
