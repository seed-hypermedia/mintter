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
      if (typeof event === 'object' && event.key === 'connectPeer') {
        // const route = decodeRouteFromPath(event.value)
        // dispatch({type: 'replace', route})
        toast.success(`Connecting to peer ${event.peer.substring(0, 20)}...`)
      }
    })
  }, [])
  //   useEffect(() => {
  //     console.log(
  //       `${routes.map((r, i) => {
  //         const {key, ...rest} = r
  //         return `${i === routeIndex ? '✅' : '⏺️'} ${key} :: ${simpleStringy(
  //           rest,
  //         )}`
  //       }).join(`
  // `)}`,
  //     )
  //   }, [routes, routeIndex])

  useEffect(() => {
    setAppNavDispatch(dispatch)
    return () => {
      setAppNavDispatch(null)
    }
  }, [])

  // go to pub with pending edit
  // resume editing
  // press forward
  // draft changes?!

  // start editing pub, add content
  // second time resume editing, doesnt work

  let value = useMemo(
    () => ({
      state: navState,
      dispatch,
    }),
    [navState],
  )

  return <NavContextProvider value={value}>{children}</NavContextProvider>
}
