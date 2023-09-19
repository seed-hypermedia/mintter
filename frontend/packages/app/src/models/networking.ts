import {ConnectError} from '@bufbuild/connect-web'
import {useDaemonReady} from '@mintter/app/node-status-context'
import appError from '@mintter/app/src/errors'
import {ConnectionStatus, GRPCClient, PeerInfo} from '@mintter/shared'
import {
  FetchQueryOptions,
  UseQueryOptions,
  useQuery,
} from '@tanstack/react-query'
import {useGRPCClient} from '../app-context'
import {queryKeys} from './query-keys'

export function useConnectedPeers(
  options: UseQueryOptions<PeerInfo[], ConnectError> = {},
) {
  const client = useGRPCClient()
  let isDaemonReady = useDaemonReady()
  return useQuery<PeerInfo[], ConnectError>({
    queryKey: [queryKeys.GET_PEERS],
    queryFn: async () => {
      const listed = await client.networking.listPeers({})
      return listed.peers.filter((info) => {
        return info.connectionStatus === ConnectionStatus.CONNECTED
      })
    },
    enabled: isDaemonReady,
    ...options,
  })
}

function queryPeerInfo(
  grpcClient: GRPCClient,
  deviceId?: string,
):
  | UseQueryOptions<PeerInfo, ConnectError>
  | FetchQueryOptions<PeerInfo, ConnectError> {
  return {
    queryKey: [queryKeys.GET_PEER_INFO, deviceId],
    enabled: !!deviceId,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    retry: true,
    queryFn: () => grpcClient.networking.getPeerInfo({deviceId: deviceId}),
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

export function usePeerInfo(deviceId?: string) {
  const grpcClient = useGRPCClient()
  return useQuery<PeerInfo, ConnectError>(queryPeerInfo(grpcClient, deviceId))
}
