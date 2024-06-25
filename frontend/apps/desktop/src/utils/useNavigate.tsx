import {startTransition, useCallback} from 'react'
import {useIPC} from '../app-context'
import {NavMode, useNavigationDispatch} from './navigation'
import {encodeRouteToPath} from './route-encoding'
import {NavRoute} from './routes'
import {getRouteWindowType, getWindowType} from './window-types'

export function useNavigate(requestedMode: NavMode = 'push') {
  const dispatch = useNavigationDispatch()
  const {invoke} = useIPC()
  return useCallback(
    (route: NavRoute) => {
      const routeWindowType = getRouteWindowType(route)
      const mode =
        routeWindowType.key === getWindowType() ? requestedMode : 'spawn'
      startTransition(() => {
        if (mode === 'spawn') {
          const path = encodeRouteToPath(route)
          invoke('plugin:window|open', {path})
        } else if (mode === 'push') {
          dispatch({type: 'push', route})
        } else if (mode === 'replace') {
          dispatch({type: 'replace', route})
        } else if (mode === 'backplace') {
          dispatch({type: 'backplace', route})
        }
      })
    },
    [dispatch, invoke, requestedMode],
  )
}

export function useClickNavigate() {
  const navigate = useNavigate()
  const spawn = useNavigate('spawn')

  return (
    route: NavRoute,
    event: any, // GestureResponderEvent
  ) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.metaKey || event.shiftKey) {
      spawn(route)
    } else {
      navigate(route)
    }
  }
}
