import {accountsClient} from '@app/api-clients'
import {Account, Profile} from '@mintter/shared'
import {useMutation, UseMutationOptions, useQuery} from '@tanstack/react-query'
import {queryKeys} from '@app/models/query-keys'
import {useAllPeers} from './networking'
import {useDaemonReady} from '@app/node-status-context'
import {fetchDaemonInfo, useDaemonInfo} from '@app/models/daemon'
import {appInvalidateQueries} from '@app/query-client'

export function useAccount(accountId?: string) {
  let isDaemonReady = useDaemonReady()
  return useQuery({
    enabled: isDaemonReady && !!accountId,
    queryKey: [queryKeys.GET_ACCOUNT, accountId],
    queryFn: () => accountsClient.getAccount({id: accountId}),
    onError: (err) => {
      console.log(`useAccount error: ${err}`)
    },
  })
}

export function useAllAccounts() {
  let isDaemonReady = useDaemonReady()
  const contacts = useQuery({
    enabled: !!isDaemonReady,
    queryKey: [queryKeys.GET_ALL_ACCOUNTS],
    queryFn: async () => {
      return await accountsClient.listAccounts({})
    },
  })
  return contacts
}

export function useConnectionSummary() {
  const peerInfo = useAllPeers()
  const connectedPeers = peerInfo.data?.peerList || []
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
        isConnected: !!peers.data?.peerList.find(
          (peer) => peer.deviceId === deviceId,
        ),
      }
    }),
  }
}

export function useAccountIsConnected(account: Account) {
  const peers = useAllPeers()
  return !!peers.data?.peerList.find((peer) => peer.accountId === account.id)
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
