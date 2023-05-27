import {networkingClient} from '@app/api-clients'
import appError from '@app/errors'
import {useDaemonReady} from '@app/node-status-context'
import {appQueryClient} from '@app/query-client'
import {ConnectError} from '@bufbuild/connect-web'
import {PeerInfo} from '@mintter/shared'
import {ConnectionStatus} from '@mintter/shared/client/.generated/networking/v1alpha/networking_pb'
import {
  FetchQueryOptions,
  useQuery,
  UseQueryOptions,
} from '@tanstack/react-query'
import {queryKeys} from './query-keys'

type PeerListResponse = {
  peers: {
    accountId: string
    deviceId: string
    peerId: string
    isConnected: boolean
  }[]
}
export function useAllPeers(
  options: UseQueryOptions<PeerListResponse, ConnectError> = {},
) {
  let isDaemonReady = useDaemonReady()
  return useQuery<PeerListResponse, ConnectError>({
    queryKey: [queryKeys.GET_PEERS],
    queryFn: async () => {
      const allPeers = await networkingClient.listPeers({status: -1})
      const connected = await networkingClient.listPeers({
        status: ConnectionStatus.CONNECTED,
      })
      const connectedPeerIds = new Set(
        connected.peerList.map((peer) => peer.peerId),
      )
      return {
        peers: allPeers.peerList.map((peer) => {
          return {
            accountId: peer.accountId,
            deviceId: peer.deviceId,
            peerId: peer.peerId,
            isConnected: connectedPeerIds.has(peer.peerId),
          }
        }),
      }
    },
    enabled: isDaemonReady,
    onError: (err) => {
      appError(
        `useAllPeers Error code ${err.code}: ${err.message}`,
        err.metadata,
      )
    },
    ...options,
  })
}

function queryPeerInfo(
  deviceId?: string,
):
  | UseQueryOptions<PeerInfo, ConnectError>
  | FetchQueryOptions<PeerInfo, ConnectError> {
  return {
    queryKey: [queryKeys.GET_PEER_INFO, deviceId],
    enabled: !!deviceId,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    retry: true,
    queryFn: () => networkingClient.getPeerInfo({deviceId: deviceId}),
    onError: (err) => {
      appError(
        `queryPeerInfo Error code ${err.code}: ${err.message}`,
        err.metadata,
      )
    },
    // refetchInterval: 2000,
    // refetchIntervalInBackground: true,
  }
}

export async function fetchPeerInfo(deviceId: string) {
  return await appQueryClient.fetchQuery(queryPeerInfo(deviceId))
}

export function usePeerInfo(deviceId?: string) {
  return useQuery<PeerInfo, ConnectError>(queryPeerInfo(deviceId))
}
