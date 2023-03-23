import {accountsClient, networkingClient} from '@app/api-clients'
import {Account, ConnectionStatus} from '@mintter/shared'
import {useQueries, useQuery} from '@tanstack/react-query'
import {queryKeys} from '.'

export function useContactsList() {
  const contacts = useQuery({
    queryKey: [queryKeys.GET_CONTACTS_LIST],
    queryFn: async () => {
      return await accountsClient.listAccounts({})
    },
  })
  return contacts
}

export function useAccount(accountId: string) {
  const account = useQuery({
    queryKey: [queryKeys.GET_ACCOUNT, accountId],
    queryFn: async () => {
      return await accountsClient.getAccount({id: accountId})
    },
  })
  return account
}

export function useAccountWithDevices(accountId: string) {
  const account = useAccount(accountId)
  const peerInfo = usePeerInfo(account?.data)
  // account.data?.devices[0].peerId
  // peerInfo[0].data?.addrs
  // peerInfo[0].data?.accountId
  // peerInfo[0].data?.connectionStatus
  return {
    profile: account.data?.profile,
    peers: peerInfo.map((peer) => peer.data),
  }
}

export function usePeerInfo(account?: Account) {
  return useQueries({
    queries: Object.entries(account?.devices || {}).map(([, device]) => ({
      queryKey: [queryKeys.GET_PEER_INFO, account?.id],
      queryFn: async () => {
        return await networkingClient.getPeerInfo({peerId: device.peerId})
      },
    })),
  })
}

export function useAccountIsConnected(account: Account) {
  const peerInfoQueries = usePeerInfo(account)
  const isConnected = peerInfoQueries.some(
    (peerInfoQuery) =>
      peerInfoQuery.data?.connectionStatus == ConnectionStatus.CONNECTED,
  )
  return isConnected
}
