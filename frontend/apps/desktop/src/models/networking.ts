import {networkingClient} from '@app/api-clients'
import {appQueryClient} from '@app/query-client'
import {PeerInfo} from '@mintter/shared'
import {
  FetchQueryOptions,
  useQuery,
  UseQueryOptions,
} from '@tanstack/react-query'
import {queryKeys} from './query-keys'

export function useAllPeers() {
  return useQuery({
    queryKey: [queryKeys.GET_PEERS],
    queryFn: async () => {
      return await networkingClient.listPeers({})
    },
  })
}

function queryPeerInfo(
  deviceId?: string,
): UseQueryOptions<PeerInfo> | FetchQueryOptions<PeerInfo> {
  return {
    queryKey: [queryKeys.GET_PEER_INFO, deviceId],
    enabled: !!deviceId,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    retry: true,
    queryFn: () => networkingClient.getPeerInfo({deviceId: deviceId}),
    // refetchInterval: 2000,
    // refetchIntervalInBackground: true,
  }
}

export async function fetchPeerInfo(deviceId: string) {
  return await appQueryClient.fetchQuery(queryPeerInfo(deviceId))
}

export function usePeerInfo(deviceId?: string) {
  return useQuery<PeerInfo>(queryPeerInfo(deviceId))
}
