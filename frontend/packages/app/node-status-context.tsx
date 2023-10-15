import {Onboarding} from './pages/onboarding'
import {ConnectionStatus} from '@mintter/shared'
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {useDaemonInfo} from './models/daemon'
import {usePeerInfo} from './models/networking'

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
  let infoQuery = useDaemonInfo()
  let peerInfoQuery = usePeerInfo(infoQuery.data?.deviceId)

  let value = useMemo(
    () => ({
      ...defaultValue,
      ...peerInfoQuery.data,
      isReady: !!peerInfoQuery.data?.addrs.length,
    }),
    [peerInfoQuery],
  )

  if (infoQuery.data === null) {
    return <Onboarding />
  }

  if (infoQuery.status == 'success') {
    return <Provider value={value}>{children}</Provider>
  }

  return null
}

export function useDaemonReady() {
  let context = useContext(daemonContext)
  return useMemo(() => (context ? context.isReady : false), [context])
}
