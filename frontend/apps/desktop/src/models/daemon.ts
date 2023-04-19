import {daemonClient} from '@app/api-clients'
import {appQueryClient} from '@app/query-client'
import {Info} from '@mintter/shared'
import {
  FetchQueryOptions,
  useMutation,
  UseMutationOptions,
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

export function useMnemonics() {
  return useQuery({
    queryKey: ['onboarding', 'mnemonics'],
    queryFn: async () => {
      const data = await daemonClient.genMnemonic({mnemonicsLength: 12})
      return data.mnemonic
    },
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })
}

export function useAccountRegistration(
  opts?: UseMutationOptions<void, unknown, string[]>,
) {
  return useMutation({
    mutationFn: async (words: string[]) => {
      await daemonClient.register({mnemonic: words})
    },
    ...opts,
  })
}
