import { PeerInfo } from '@mintter/api/networking/v1alpha/networking'
import { UseQueryOptions, useQuery, useQueryClient } from 'react-query'
import { useMemo } from 'react'
import { Info } from '@mintter/api/daemon/v1alpha/daemon'
import { listPeerAddrs } from './lib'

export type UsePeerAddrsOptions = UseQueryOptions<PeerInfo['addrs'], unknown, PeerInfo['addrs']>

/**
 * 
 * @param peerId 
 * @param options 
 * @returns 
 */
export function usePeerAddrs(peerId?: string, options: UsePeerAddrsOptions = {}) {
  const queryClient = useQueryClient()

  let requestId: string
  if (!peerId) {
    const info = queryClient.getQueryData<Info>('GetInfo')
    requestId = info?.peerId as string
  } else {
    requestId = peerId
  }

  const peerAddrsQuery = useQuery(
    ['PeerAddrs', requestId],
    () => listPeerAddrs(requestId),
    {
      enabled: !!requestId,
      ...options,
    },
  )

  const data = useMemo(() => peerAddrsQuery.data, [peerAddrsQuery.data])

  return {
    ...peerAddrsQuery,
    data,
  }
}

/**
 *
 * @deprecated
 */
export function useSuggestedConnections({ page } = { page: 0 }, options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
  };
}