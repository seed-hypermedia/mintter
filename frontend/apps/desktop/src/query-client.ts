import {listen, send} from '@app/ipc'
import {QueryCache, QueryClient, QueryKey} from '@tanstack/react-query'
import {toast} from './toast'
import {labelOfQueryKey, queryKeys} from './models/query-keys'
import {JsonValue} from '@bufbuild/protobuf'
import {copyTextToClipboard} from './utils/copy-to-clipboard'

function copyDetails(randomDetails: JsonValue) {
  const detailString = JSON.stringify(randomDetails, null, 2)
  copyTextToClipboard(detailString)
  toast.success(`📋 Copied details to clipboard`)
}

export const appQueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err, query) => {
      const queryKey = query.queryKey as string[]
      const errorMessage = ((err as any)?.message || null) as string | null // todo: repent for my sins
      toast.error(`Failed to Load ${labelOfQueryKey(queryKey)}`, {
        onClick: () => {
          copyDetails({queryKey, errorMessage})
        },
      })
    },
  }),
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

// horrible hack during tauri/electron migration. used to defer execution until the ipc is ready
setTimeout(() => {
  listen('invalidate_queries', (event) => {
    const queryKey = event.payload as QueryKey
    appQueryClient.invalidateQueries(queryKey)
  }).then((unlisten) => {
    // noop
  })
}, 1)

export function appInvalidateQueries(queryKeys: QueryKey) {
  send?.('invalidate_queries', queryKeys)
}
