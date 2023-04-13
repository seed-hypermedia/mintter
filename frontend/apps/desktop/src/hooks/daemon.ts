import {daemonClient} from '@app/api-clients'
import {appQueryClient} from '@app/query-client'
import {Info} from '@mintter/shared'
import {
  FetchQueryOptions,
  useQuery,
  UseQueryOptions,
} from '@tanstack/react-query'
import {queryKeys} from './query-keys'

function queryDaemonInfo():
  | UseQueryOptions<Info | null>
  | FetchQueryOptions<Info | null> {
  return {
    queryKey: [queryKeys.GET_DAEMON_INFO],
    queryFn: async () => {
      try {
        return await daemonClient.getInfo({})
      } catch (error) {
        if (error) {
          console.log('error check make sure not set up condition..', error)
        }
      }
      return null
    },
    retry: false,
    useErrorBoundary: false,
  }
}
export function useDaemonInfo() {
  return useQuery(queryDaemonInfo())
}

export function fetchDaemonInfo() {
  return appQueryClient.fetchQuery(queryDaemonInfo())
}
