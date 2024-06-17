import {JsonValue} from '@bufbuild/protobuf'
import {AppIPC} from '@shm/app/app-ipc'
import {copyTextToClipboard, toast} from '@shm/ui'
import {
  QueryCache,
  QueryClient,
  QueryKey,
  onlineManager,
} from '@tanstack/react-query'
import {labelOfQueryKey} from './models/query-keys'

function copyDetails(randomDetails: JsonValue) {
  const detailString = JSON.stringify(randomDetails, null, 2)
  copyTextToClipboard(detailString)
  toast.success(`📋 Copied details to clipboard`)
}

export type AppInvalidateQueries = (queryKey: QueryKey) => void
export type AppQueryClient = {
  client: QueryClient
  invalidate: AppInvalidateQueries
}
export function getQueryClient(ipc: AppIPC): AppQueryClient {
  const client = new QueryClient({
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
      mutations: {
        networkMode: 'always',
      },
      queries: {
        networkMode: 'always',
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

  function appInvalidateQueries(queryKey: QueryKey) {
    ipc.send?.('invalidate_queries', queryKey)
  }

  return {
    client,
    invalidate: appInvalidateQueries,
  }
}

// this is so fucked up, RQ will refuse to run mutations if !isOnline
onlineManager.setOnline(true)
