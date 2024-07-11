import {useGRPCClient, useQueryInvalidator} from '@/app-context'
import {Code, ConnectError} from '@connectrpc/connect'
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
      await grpcClient.daemon.registerKey({mnemonic: words})
    },
    ...opts,
  })
}

export function useMyAccountIds() {
  const client = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.LOCAL_ACCOUNT_ID_LIST],
    queryFn: async () => {
      try {
        const q = await client.daemon.listKeys({})
        return q?.keys.map((k) => k.publicKey)
      } catch (e) {
        const connectError = ConnectError.from(e)
        console.error(
          `useMyAccountIds error code ${
            Code[connectError.code]
          }: ${JSON.stringify(connectError.message)}`,
        )
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
  opts?: UseMutationOptions<any, unknown, {accountId: string}>,
) {
  const grpcClient = useGRPCClient()
  const invalidate = useQueryInvalidator()
  return useMutation({
    mutationFn: async ({accountId}) => {
      console.log('is deleting key', accountId)
      const keys = await grpcClient.daemon.listKeys({})
      const keyToDelete = keys.keys.find((key) => accountId === key.publicKey)
      console.log(keys.keys, keyToDelete)
      if (!keyToDelete) throw new Error('Key not found')
      return grpcClient.daemon.deleteKey({name: keyToDelete.name})
    },
    onSuccess: () => {
      invalidate([queryKeys.LOCAL_ACCOUNT_ID_LIST])
    },
    ...opts,
  })
}

export function useSavedMnemonics() {
  // todo support multi-account
  return trpc.secureStorage.read.useQuery('main').data as
    | Array<string>
    | undefined
}
