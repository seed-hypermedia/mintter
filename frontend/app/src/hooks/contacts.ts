import {accountsClient, networkingClient} from '@app/api-clients'
import {Account, ConnectionStatus, Device} from '@mintter/shared'
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

export function useConnectionSummary() {
  const contacts = useContactsList()
  const allDevices = contacts.data?.accounts
    .map((account) => Object.values(account.devices))
    .flat()
  const peerInfo = usePeerInfo(allDevices)
  const loadedDevices = peerInfo.map((peer) => peer.data)
  const connectedDevices = loadedDevices.filter(
    (device) => device?.connectionStatus === ConnectionStatus.CONNECTED,
  )
  return {
    online: connectedDevices.length > 0,
    connectedCount: connectedDevices.length,
  }
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
  const peerInfo = usePeerInfo(
    account?.data?.devices ? Object.values(account.data.devices) : [],
  )
  // account.data?.devices[0].peerId
  // peerInfo[0].data?.addrs
  // peerInfo[0].data?.accountId
  // peerInfo[0].data?.connectionStatus
  return {
    profile: account.data?.profile,
    peers: peerInfo.map((peer) => peer.data),
  }
}

export function usePeerInfo(devices?: Device[]) {
  return useQueries({
    queries: Object.entries(devices || {}).map(([, device]) => ({
      queryKey: [queryKeys.GET_PEER_INFO, device.peerId],
      queryFn: async () => {
        return await networkingClient.getPeerInfo({peerId: device.peerId})
      },
    })),
  })
}

export function useAccountIsConnected(account: Account) {
  const peerInfoQueries = usePeerInfo(Object.values(account.devices))
  const isConnected = peerInfoQueries.some(
    (peerInfoQuery) =>
      peerInfoQuery.data?.connectionStatus == ConnectionStatus.CONNECTED,
  )
  return isConnected
}
