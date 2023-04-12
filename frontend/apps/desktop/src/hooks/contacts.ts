import {accountsClient, networkingClient} from '@app/api-clients'
import {Account, ConnectionStatus, Device} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
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
  const peerInfo = usePeerInfo()
  const connectedPeers = peerInfo.data?.peerList || []
  return {
    online: connectedPeers.length > 0,
    connectedCount: connectedPeers.length,
  }
}

export function useAccount(accountId: string) {
  const account = useQuery({
    queryKey: [queryKeys.GET_ACCOUNT, accountId],
    queryFn: () => accountsClient.getAccount({id: accountId}),
  })
  return account
}

export function useAccountWithDevices(accountId: string) {
  const account = useAccount(accountId)
  const peers = usePeerInfo()
  return {
    profile: account.data?.profile,
    devices: Object.values(account?.data?.devices || {}).map((device) => {
      // I think this is the cause of much confusion:
      const deviceId = device.peerId
      // see https://github.com/mintterteam/mintter/issues/1368
      return {
        deviceId,
        isConnected: !!peers.data?.peerList.find(
          (peer) => peer.deviceId === deviceId,
        ),
      }
    }),
  }
}

export function usePeerInfo() {
  return useQuery({
    queryKey: [queryKeys.GET_PEERS],
    queryFn: async () => {
      return await networkingClient.listPeers({})
    },
  })
}

export function useAccountIsConnected(account: Account) {
  const peers = usePeerInfo()
  return !!peers.data?.peerList.find((peer) => peer.accountId === account.id)
}
