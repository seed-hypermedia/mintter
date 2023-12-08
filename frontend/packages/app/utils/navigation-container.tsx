import {writeableStateStream} from '@mintter/shared'
import {ReactNode, useEffect, useMemo} from 'react'
import {useIPC} from '../app-context'
import {useConfirmConnection} from '../components/contacts-prompt'
import {
  DocumentsRoute,
  NavAction,
  NavContextProvider,
  NavState,
  navStateReducer,
  setAppNavDispatch,
} from './navigation'
import {AppWindowEvent} from './window-events'

const homeRoute: DocumentsRoute = {key: 'documents'}

export function NavigationContainer({
  children,
  initialNav = {
    sidebarLocked: false,
    routes: [homeRoute],
    routeIndex: 0,
    lastAction: 'replace',
  },
}: {
  children: ReactNode
  initialNav?: NavState
}) {
  const navigation = useMemo(() => {
    const [updateNavState, navState] = writeableStateStream(initialNav)
    return {
      dispatch(action: NavAction) {
        updateNavState(navStateReducer(navState.get(), action))
      },
      state: navState,
    }
  }, [])
  const {send} = useIPC()

  // const confirmConnection = useConfirmConnection()
  useEffect(() => {
    return navigation.state.subscribe(() => {
      send('windowNavState', navigation.state.get())
    })
  }, [navigation, send])

  useEffect(() => {
    // @ts-expect-error
    return window.appWindowEvents?.subscribe((event: AppWindowEvent) => {
      if (event === 'back') {
        navigation.dispatch({type: 'pop'})
      }
      if (event === 'forward') {
        navigation.dispatch({type: 'forward'})
      }
    })
  }, [])

  useEffect(() => {
    setAppNavDispatch(navigation.dispatch)
    return () => {
      setAppNavDispatch(null)
    }
  }, [])

  return (
    <NavContextProvider value={navigation}>
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
        confirmConnection.open(event)
      }
    })
  }, [])
  return confirmConnection.content
}
