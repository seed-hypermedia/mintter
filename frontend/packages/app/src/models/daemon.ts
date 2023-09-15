import {GRPCClient, Info} from '@mintter/shared'
import {
  FetchQueryOptions,
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from '@tanstack/react-query'
import {queryKeys} from './query-keys'
import {useGRPCClient} from '../app-context'

function queryDaemonInfo(
  grpcClient: GRPCClient,
): UseQueryOptions<Info | null> | FetchQueryOptions<Info | null> {
  return {
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
    useErrorBoundary: false,
  }
}
export function useDaemonInfo() {
  const grpcClient = useGRPCClient()
  return useQuery(queryDaemonInfo(grpcClient))
}

export function useMnemonics() {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: ['onboarding', 'mnemonics'],
    queryFn: async () => {
      const data = await grpcClient.daemon.genMnemonic({mnemonicsLength: 12})
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
