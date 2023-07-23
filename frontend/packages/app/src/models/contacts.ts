import {queryKeys} from '@mintter/app/src/models/query-keys'
import {Device} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {useAccount} from './accounts'
import {useConnectedPeers} from './networking'
import {useGRPCClient} from '../app-context'

export function useContactsList() {
  const grpcClient = useGRPCClient()
  const contacts = useQuery({
    queryKey: [queryKeys.GET_ALL_ACCOUNTS],
    queryFn: async () => {
      return await grpcClient.accounts.listAccounts({})
    },
    refetchInterval: 10000,
  })
  return contacts
}

export function useConnectionSummary() {
  const peerInfo = useConnectedPeers({
    refetchInterval: 10000,
  })
  const connectedPeers = peerInfo.data || []
  return {
    online: connectedPeers.length > 0,
    connectedCount: connectedPeers.length,
  }
}

export function useAccountWithDevices(accountId: string) {
  const account = useAccount(accountId)
  const peers = useConnectedPeers()
  return {
    profile: account.data?.profile,
    devices: Object.values(account?.data?.devices || {}).map(
      (device: Device) => {
        const deviceId = device.deviceId
        return {
          deviceId,
          isConnected: !!peers.data?.find((peer) => peer.id === deviceId),
        }
      },
    ),
  }
}
