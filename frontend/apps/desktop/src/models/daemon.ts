import {useGRPCClient} from '@shm/desktop/src/app-context'
import {useQuery} from '@tanstack/react-query'
import {queryKeys} from './query-keys'

import {GRPCClient, Info} from '@shm/shared'
import {
  FetchQueryOptions,
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
} from '@tanstack/react-query'

function queryDaemonInfo(
  grpcClient: GRPCClient,
  opts: UseQueryOptions<Info | null> | FetchQueryOptions<Info | null> = {},
): UseQueryOptions<Info | null> | FetchQueryOptions<Info | null> {
  return {
    ...opts,
    queryKey: [queryKeys.GET_DAEMON_INFO],
    queryFn: async () => {
      try {
        return await grpcClient.daemon.getInfo({})
      } catch (error) {
        if (error) {
          console.log('error check make sure not set up condition..', error)
        }
      }
      return null
    },
    refetchInterval: 10_000,
    useErrorBoundary: false,
  }
}
export function useDaemonInfo(opts: UseQueryOptions<Info | null> = {}) {
  const grpcClient = useGRPCClient()
  return useQuery(queryDaemonInfo(grpcClient, opts))
}

export function useMnemonics() {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: ['onboarding', 'mnemonics'],
    queryFn: async () => {
      const data = await grpcClient.daemon.genMnemonic({})
      return data.mnemonic
    },
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })
}

export function useAccountRegistration(
  opts?: UseMutationOptions<void, unknown, string[]>,
) {
  const grpcClient = useGRPCClient()
  return useMutation({
    mutationFn: async (words: string[]) => {
      await grpcClient.daemon.register({mnemonic: words})
    },
    ...opts,
  })
}

export function useAccountKeys() {
  const client = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.KEYS_LIST],
    queryFn: async () => {
      try {
        const q = await client.daemon.listKeys({})
        return q?.keys
      } catch (e) {
        return []
      }
    },
  })
}
