import {accountsClient} from '@app/api-clients'
import {queryKeys} from '@app/models/query-keys'
import {Account, Device} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {useAccount} from './accounts'
import {useAllPeers} from './networking'

export function useContactsList() {
  const contacts = useQuery({
    queryKey: [queryKeys.GET_ALL_ACCOUNTS],
    queryFn: async () => {
      return await accountsClient.listAccounts({})
    },
  })
  return contacts
}

export function useConnectionSummary() {
  const peerInfo = useAllPeers()
  const connectedPeers = (peerInfo.data?.peers || []).filter(
    (peer) => peer.isConnected,
  )
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
    devices: Object.values(account?.data?.devices || {}).map(
      (device: Device) => {
        const deviceId = device.deviceId
        return {
          deviceId,
          isConnected: !!peers.data?.peers.find(
            (peer) => peer.deviceId === deviceId && peer.isConnected,
          ),
        }
      },
    ),
  }
}

export function useAccountIsConnected(account: Account) {
  const peers = useAllPeers()
  return !!peers.data?.peers.find(
    (peer) => peer.accountId === account.id && peer.isConnected,
  )
}
