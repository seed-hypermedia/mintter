import {networkingClient} from '@app/api-clients'
import {appQueryClient} from '@app/query-client'
import {PeerInfo} from '@mintter/shared'
import {
  FetchQueryOptions,
  useQuery,
  UseQueryOptions,
} from '@tanstack/react-query'
import {queryKeys} from '.'

export function useAllPeers() {
  return useQuery({
    queryKey: [queryKeys.GET_PEERS],
    queryFn: async () => {
      return await networkingClient.listPeers({})
    },
  })
}

function queryPeerInfo(
  peerId?: string,
): UseQueryOptions<PeerInfo> | FetchQueryOptions<PeerInfo> {
  return {
    queryKey: [queryKeys.GET_PEER_INFO, peerId],
    enabled: !!peerId,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    retry: true,
    queryFn: () => networkingClient.getPeerInfo({peerId: peerId}),
    // refetchInterval: 2000,
    // refetchIntervalInBackground: true,
  }
}

export async function fetchPeerInfo(peerId: string) {
  return await appQueryClient.fetchQuery(queryPeerInfo(peerId))
}

export function usePeerInfo(peerId?: string) {
  return useQuery<PeerInfo>(queryPeerInfo(peerId))
}
