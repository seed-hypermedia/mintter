import {useGRPCClient} from '@/app-context'
import {useQuery} from '@tanstack/react-query'
import {queryKeys} from './query-keys'

import {trpc} from '@/trpc'
import {
  GenMnemonicResponse,
  GRPCClient,
  Info,
  RegisterKeyRequest,
} from '@shm/shared'
import {
  FetchQueryOptions,
  useMutation,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query'
import {NamedKey} from 'src/app-account'

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

export function useMnemonics(
  opts?: UseQueryOptions<GenMnemonicResponse['mnemonic']>,
) {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.GENERATE_MNEMONIC],
    queryFn: async () => {
      const data = await grpcClient.daemon.genMnemonic({})
      return data.mnemonic
    },
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    ...opts,
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

export function useRegisterKey(
  opts?: UseMutationOptions<
    NamedKey,
    unknown,
    {
      mnemonic: RegisterKeyRequest['mnemonic']
      name?: RegisterKeyRequest['name']
      passphrase?: RegisterKeyRequest['passphrase']
    }
  >,
) {
  const grpcClient = useGRPCClient()
  return useMutation({
    mutationFn: ({name = 'main', mnemonic, passphrase}) => {
      return grpcClient.daemon.registerKey({name, mnemonic, passphrase})
    },
    ...opts,
  })
}

export function useDeleteKey(
  opts?: UseMutationOptions<any, unknown, {name: string}>,
) {
  const grpcClient = useGRPCClient()
  return useMutation({
    mutationFn: ({name}) => {
      return grpcClient.daemon.deleteKey({name})
    },
    ...opts,
  })
}

export function useSavedMnemonics(key?: string) {
  return trpc.secureStorage.read.useQuery('main', {enabled: !!key}).data as
    | Array<string>
    | undefined
}
