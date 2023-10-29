import {startTransition, useCallback} from 'react'
import {encodeRouteToPath} from './route-encoding'
import {NavMode, useNavigationDispatch, NavRoute} from './navigation'
import {useIPC} from '../app-context'

export function useNavigate(mode: NavMode = 'push') {
  const dispatch = useNavigationDispatch()
  const {invoke} = useIPC()
  return useCallback(
    (route: NavRoute) => {
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
    [dispatch, invoke, mode],
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
