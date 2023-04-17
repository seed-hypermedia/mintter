import {accountsClient} from '@app/api-clients'
import {Account, Device} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {queryKeys} from '@app/hooks/query-keys'
import {useAllPeers} from './networking'
import {useAccount} from './accounts'

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
    devices: Object.values(account?.data?.devices || {}).map(
      (device: Device) => {
        const deviceId = device.deviceId
        return {
          deviceId,
          isConnected: !!peers.data?.peerList.find(
            (peer) => peer.deviceId === deviceId,
          ),
        }
      },
    ),
  }
}

export function useAccountIsConnected(account: Account) {
  const peers = useAllPeers()
  return !!peers.data?.peerList.find((peer) => peer.accountId === account.id)
}
