import {daemonClient, networkingClient} from '@app/api-clients'
import {queryKeys} from '@app/hooks'
import OnboardingPage from '@app/pages/onboarding'
import {ConnectionStatus, Info, PeerInfo} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {createContext, ReactNode, useContext, useMemo, useState} from 'react'

type PeerInfoValue = {
  addrs: Array<string>
  connectionStatus: ConnectionStatus
  accountId: string
  isReady: boolean
}
let defaultValue: PeerInfoValue = {
  addrs: [],
  connectionStatus: ConnectionStatus.NOT_CONNECTED,
  accountId: '',
  isReady: false,
}
let daemonContext = createContext<PeerInfoValue>(defaultValue)

let Provider = daemonContext.Provider

export function DaemonStatusProvider({children}: {children: ReactNode}) {
  let infoQuery = useQuery<Info>({
    queryKey: [queryKeys.GET_ACCOUNT_INFO],
    queryFn: () => daemonClient.getInfo({}),
    retry: false,
    useErrorBoundary: false,
  })
  console.log(
    '🚀 ~ file: node-status-context.tsx:29 ~ DaemonStatusProvider ~ infoQuery:',
    infoQuery,
  )

  let peerInfoQuery = useQuery<PeerInfo>({
    queryKey: [queryKeys.GET_PEER_INFO, infoQuery.data?.peerId],
    enabled: !!infoQuery.data?.peerId,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    retry: true,
    queryFn: () =>
      networkingClient.getPeerInfo({peerId: infoQuery.data?.peerId}),
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  })

  if (infoQuery.status == 'error') {
    return <OnboardingPage />
  }

  if (infoQuery.status == 'success') {
    return (
      <Provider
        value={{
          ...defaultValue,
          ...peerInfoQuery.data,
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
