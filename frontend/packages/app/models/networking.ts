import {ConnectError} from '@connectrpc/connect'
import {useDaemonReady} from '@mintter/app/node-status-context'
import appError from '@mintter/app/errors'
import {ConnectionStatus, GRPCClient, PeerInfo} from '@mintter/shared'
import {
  FetchQueryOptions,
  UseQueryOptions,
  useQuery,
} from '@tanstack/react-query'
import {useGRPCClient} from '../app-context'
import {queryKeys} from './query-keys'
import {useEffect, useRef, useState} from 'react'

export function useIsOnline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  useEffect(() => {
    function setOnline() {
      setIsOnline(true)
    }
    function setOffline() {
      setIsOnline(false)
    }
    window.addEventListener('online', setOnline)
    window.addEventListener('offline', setOffline)
    return () => {
      window.removeEventListener('online', setOnline)
      window.removeEventListener('offline', setOffline)
    }
  }, [])
  return isOnline
}

async function checkGatewayConnected(): Promise<0 | 1 | 2> {
  return await fetch('https://hyper.media/.well-known/hypermedia-site')
    .then(async (res) => {
      if (res.status === 200) return 2
      return 0
    })
    .catch((e) => {
      if (e.message.match('Failed to fetch')) return 1
      throw e
    })
}

export function useIsGatewayConnected() {
  const [isConnected, setIsConnected] = useState<0 | 1 | 2 | null>(null)
  const promise = useRef<Promise<unknown> | boolean>(true) // true is ready to start, false is stopped, promise is in progress
  useEffect(() => {
    if (!promise.current) promise.current = true
    function start() {
      if (promise.current === false) return
      promise.current = checkGatewayConnected()
        .then((status) => setIsConnected(status))
        .then(() => {
          return new Promise<void>((resolve) =>
            setTimeout(() => resolve(), 2_000),
          )
        })
        .catch((e) => {
          console.error('Unexpected checkGatewayConnected Error', e)
        })
        .finally(() => {
          start()
        })
    }
    start()
    return () => {
      promise.current = false
    }
  }, [])
  return isConnected
}

export function usePeers(
  filterConnected: boolean,
  options: UseQueryOptions<PeerInfo[], ConnectError> = {},
) {
  const client = useGRPCClient()
  // let isDaemonReady = useDaemonReady()
  return useQuery<PeerInfo[], ConnectError>({
    queryKey: [queryKeys.GET_PEERS, filterConnected],
    queryFn: async () => {
      const listed = await client.networking.listPeers({})
      if (filterConnected)
        return listed.peers.filter((info) => {
          return info.connectionStatus === ConnectionStatus.CONNECTED
        })
      return listed.peers
    },
    enabled: true,
    ...options,
  })
}

export function useConnectedPeers(
  options: UseQueryOptions<PeerInfo[], ConnectError> = {},
) {
  return usePeers(true, options)
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
