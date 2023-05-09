import {networkingClient} from '@app/api-clients'
import appError from '@app/errors'
import {useDaemonReady} from '@app/node-status-context'
import {appQueryClient} from '@app/query-client'
import {ConnectError} from '@bufbuild/connect-web'
import {PeerInfo} from '@mintter/shared'
import {ListPeersResponse} from '@mintter/shared/client/.generated/networking/v1alpha/networking_pb'
import {
  FetchQueryOptions,
  useQuery,
  UseQueryOptions,
} from '@tanstack/react-query'
import {queryKeys} from './query-keys'

export function useAllPeers(
  options: UseQueryOptions<ListPeersResponse, ConnectError> = {},
) {
  let isDaemonReady = useDaemonReady()
  return useQuery<ListPeersResponse, ConnectError>({
    queryKey: [queryKeys.GET_PEERS],
    queryFn: () => networkingClient.listPeers({}),
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
