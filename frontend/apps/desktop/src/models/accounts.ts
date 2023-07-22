import {accountsClient} from '@app/api-clients'
import {Account, ListAccountsResponse, Profile} from '@mintter/shared'
import {useMutation, UseMutationOptions, useQuery} from '@tanstack/react-query'
import {queryKeys} from '@app/models/query-keys'
import {useConnectedPeers} from './networking'
import {useDaemonReady} from '@app/node-status-context'
import {useDaemonInfo} from '@app/models/daemon'
import appError from '@app/errors'
import {ConnectError} from '@bufbuild/connect-web'
import {useGRPCClient, useQueryInvalidator} from '@mintter/app'

export function useAccount(accountId?: string) {
  return useQuery<Account, ConnectError>({
    enabled: !!accountId,
    queryKey: [queryKeys.GET_ACCOUNT, accountId],
    queryFn: () => accountsClient.getAccount({id: accountId}),
    useErrorBoundary: () => false,
  })
}

export function useAllAccounts() {
  let isDaemonReady = useDaemonReady()
  const contacts = useQuery<ListAccountsResponse, ConnectError>({
    enabled: !!isDaemonReady,
    queryKey: [queryKeys.GET_ALL_ACCOUNTS],
    queryFn: async () => {
      return await accountsClient.listAccounts({})
    },
    onError: (err) => {
      appError(`useAllAccounts Error ${err.code}: ${err.message}`, err.metadata)
    },
  })
  return contacts
}

export function useAccountIsConnected(account: Account) {
  const peers = useConnectedPeers()
  return !!peers.data?.find((peer) => peer.accountId == account.id)
}

export function useMyAccount() {
  const daemonInfo = useDaemonInfo()
  return useAccount(daemonInfo.data?.accountId)
}

export function useSetProfile(
  opts?: UseMutationOptions<string, unknown, Partial<Profile>>,
) {
  const invalidate = useQueryInvalidator()
  const grpcClient = useGRPCClient()
  return useMutation({
    mutationFn: async (profile: Partial<Profile>) => {
      const daemonInfo = await grpcClient.daemon.getInfo({})
      const accountId = daemonInfo?.accountId
      await accountsClient.updateProfile(profile)
      return accountId || '' // empty string here is nonsense but we need to pass the account id to the invalidation fn if we have it
      // but accountId is empty during onboarding, so the invalidate will be nonsense but who cares
    },
    onSuccess: (accountId, ...rest) => {
      invalidate([queryKeys.GET_ACCOUNT, accountId])
      opts?.onSuccess?.(accountId, ...rest)
    },
    ...opts,
  })
}
