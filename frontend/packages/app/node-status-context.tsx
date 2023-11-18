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
import {Onboarding} from './pages/onboarding'

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
  const [completedOnboarding, setCompletedOnboarding] = useState<
    boolean | null
  >(null)

  let value = useMemo(
    () => ({
      ...defaultValue,
      ...peerInfoQuery.data,
      isReady: !!peerInfoQuery.data?.addrs.length,
    }),
    [peerInfoQuery],
  )

  useEffect(() => {
    if (infoQuery.data === null) {
      setCompletedOnboarding(false)
    } else if (infoQuery.data !== null && completedOnboarding === null) {
      setCompletedOnboarding(true)
    }
  }, [infoQuery.data, completedOnboarding])

  if (completedOnboarding) {
    return <Provider value={value}>{children}</Provider>
  }

  if (completedOnboarding === false) {
    return (
      <Provider value={value}>
        <Onboarding
          onComplete={() => {
            setCompletedOnboarding(true)
          }}
        />
      </Provider>
    )
  }

  return null
}

export function useDaemonReady() {
  let context = useContext(daemonContext)
  return useMemo(() => (context ? context.isReady : false), [context])
}
