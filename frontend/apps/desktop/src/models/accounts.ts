import {accountsClient} from '@app/api-clients'
import {Account, ListAccountsResponse, Profile} from '@mintter/shared'
import {useMutation, UseMutationOptions, useQuery} from '@tanstack/react-query'
import {queryKeys} from '@app/models/query-keys'
import {useAllPeers} from './networking'
import {useDaemonReady} from '@app/node-status-context'
import {fetchDaemonInfo, useDaemonInfo} from '@app/models/daemon'
import {appInvalidateQueries} from '@app/query-client'
import appError from '@app/errors'
import {ConnectError} from '@bufbuild/connect-web'

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

export function useConnectionSummary() {
  const peerInfo = useAllPeers()
  const connectedPeers = peerInfo.data?.peers || []
  return {
    online: connectedPeers.length > 0,
    connectedCount: connectedPeers.length,
  }
}

export function useAccountWithDevices(accountId: string) {
  const account = useAccount(accountId)
  const peers = useAllPeers()
  return {
    profile: account.data?.profile,
    devices: Object.values(account?.data?.devices || {}).map((device) => {
      const deviceId = device.deviceId
      return {
        deviceId,
        isConnected: !!peers.data?.peers.find(
          (peer) => peer.deviceId === deviceId,
        ),
      }
    }),
  }
}

export function useAccountIsConnected(account: Account) {
  const peers = useAllPeers()
  return !!peers.data?.peers.find(
    (peer) => peer.accountId == account.id && peer.isConnected,
  )
}

export function useMyAccount() {
  const daemonInfo = useDaemonInfo()
  return useAccount(daemonInfo.data?.accountId)
}

export function useSetProfile(
  opts?: UseMutationOptions<string, unknown, Partial<Profile>>,
) {
  return useMutation({
    mutationFn: async (profile: Partial<Profile>) => {
      const daemonInfo = await fetchDaemonInfo()
      const accountId = daemonInfo?.accountId
      await accountsClient.updateProfile(profile)
      return accountId || '' // empty string here is nonsense but we need to pass the account id to the invalidation fn if we have it
      // but accountId is empty during onboarding, so the invalidate will be nonsense but who cares
    },
    onSuccess: (accountId, ...rest) => {
      appInvalidateQueries([queryKeys.GET_ACCOUNT, accountId])
      opts?.onSuccess?.(accountId, ...rest)
    },
    ...opts,
  })
}
