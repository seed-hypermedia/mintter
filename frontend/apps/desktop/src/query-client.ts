import {QueryClient, QueryKey} from '@tanstack/react-query'
import {emit as tauriEmit, listen as tauriListen} from '@tauri-apps/api/event'

export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      useErrorBoundary: true,
      retryOnMount: false,
      staleTime: Infinity,
      refetchOnReconnect: false,
      onError: (err) => {
        console.log(`Query error: ${JSON.stringify(err)}`)
      },
      retry: 4,
      retryDelay: (attempt) =>
        Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 30 * 1000),
      keepPreviousData: true,
    },
  },
})

tauriListen('invalidate_queries', (event) => {
  const queryKey = event.payload as QueryKey
  appQueryClient.invalidateQueries(queryKey)
}).then((unlisten) => {
  // noop
})

export function appInvalidateQueries(queryKeys: QueryKey) {
  appQueryClient.invalidateQueries(queryKeys)
  tauriEmit('invalidate_queries', queryKeys)
}
