import {daemonClient, networkingClient} from '@app/api-clients'
import {queryKeys} from '@app/hooks'
import OnboardingPage from '@app/pages/onboarding'
import {ConnectionStatus, Info, PeerInfo} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

type PeerInfoValue = {
  addrs: Array<string>
  connectionStatus: ConnectionStatus
  accountId: string
  isReady: boolean
  netStatus: 'online' | 'offline'
}
let defaultValue: PeerInfoValue = {
  addrs: [],
  connectionStatus: ConnectionStatus.NOT_CONNECTED,
  accountId: '',
  isReady: false,
  netStatus: 'online',
}
let daemonContext = createContext<PeerInfoValue>(defaultValue)

let Provider = daemonContext.Provider

export function DaemonStatusProvider({children}: {children: ReactNode}) {
  let [netStatus, setNetStatus] = useState<'online' | 'offline'>('online')
  let infoQuery = useQuery<Info | null>({
    queryKey: [queryKeys.GET_ACCOUNT_INFO],
    queryFn: async () => {
      try {
        return await daemonClient.getInfo({})
      } catch (error) {
        if (error) {
          console.log('error check make sure not set up condition..', error)
        }
      }
      return null
    },
    retry: false,
    useErrorBoundary: false,
  })

  let peerInfoQuery = useQuery<PeerInfo>({
    queryKey: [queryKeys.GET_PEER_INFO, infoQuery.data?.peerId],
    enabled: !!infoQuery.data?.peerId,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    retry: true,
    queryFn: () =>
      networkingClient.getPeerInfo({peerId: infoQuery.data?.peerId}),
    // refetchInterval: 2000,
    // refetchIntervalInBackground: true,
  })

  useEffect(() => {
    function handleOnline() {
      setNetStatus('online')
    }

    function handleOffline() {
      setNetStatus('offline')
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (infoQuery.data === null) {
    return <OnboardingPage />
  }

  if (infoQuery.status == 'success') {
    return (
      <Provider
        value={{
          ...defaultValue,
          ...peerInfoQuery.data,
          netStatus,
          isReady: !!peerInfoQuery.data?.addrs.length,
        }}
      >
        {children}
      </Provider>
    )
  }

  return null
}

export function useDaemonReady() {
  let context = useContext(daemonContext)
  return useMemo(() => (context ? context.isReady : false), [context])
}

export function useOnline() {
  let context = useContext(daemonContext)
  return useMemo(() => context?.netStatus == 'online', [context])
}
