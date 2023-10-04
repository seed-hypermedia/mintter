import {ReactNode, useEffect, useMemo, useReducer} from 'react'
import {useIPC} from '../app-context'
import {toast} from '../toast'
import {
  AppWindowEvent,
  HomeRoute,
  NavContextProvider,
  NavRoute,
  NavState,
  navStateReducer,
  setAppNavDispatch,
} from './navigation'
import {decodeRouteFromPath} from './route-encoding'
import {useConfirmConnection} from '../components/contacts-prompt'

const initRouteEncoded = window.location.pathname.slice(1)

const homeRoute: HomeRoute = {key: 'home'}

let initRoute: NavRoute = homeRoute

try {
  if (initRouteEncoded === '') {
    initRoute = homeRoute
  } else {
    initRoute = decodeRouteFromPath(initRouteEncoded)
  }
} catch (e) {
  console.log(`Initial Route: "${initRouteEncoded}"`)
  console.error('Error parsing initial route! ', e)
}

export function NavigationContainer({
  children,
  initialNav = {
    routes: [initRoute],
    routeIndex: 0,
    lastAction: 'replace',
  },
}: {
  children: ReactNode
  initialNav?: NavState
}) {
  const [navState, dispatch] = useReducer(navStateReducer, initialNav)
  const {send} = useIPC()

  // const confirmConnection = useConfirmConnection()

  useEffect(() => {
    send('windowNavState', navState)
  }, [navState, send])

  useEffect(() => {
    return window.appWindowEvents?.subscribe((event: AppWindowEvent) => {
      if (event === 'back') {
        dispatch({type: 'pop'})
      }
      if (event === 'forward') {
        dispatch({type: 'forward'})
      }
    })
  }, [])

  useEffect(() => {
    setAppNavDispatch(dispatch)
    return () => {
      setAppNavDispatch(null)
    }
  }, [])

  let value = useMemo(
    () => ({
      state: navState,
      dispatch,
    }),
    [navState],
  )

  return (
    <NavContextProvider value={value}>
      {children}
      <ConnectionConfirmer />
    </NavContextProvider>
  )
}

function ConnectionConfirmer() {
  const confirmConnection = useConfirmConnection()
  useEffect(() => {
    return window.appWindowEvents?.subscribe((event: AppWindowEvent) => {
      if (typeof event === 'object' && event.key === 'connectPeer') {
        const peerId = event.peer.substring(0, 20)
        confirmConnection.open(peerId)
      }
    })
  }, [])
  return confirmConnection.content
}
