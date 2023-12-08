import {useCallback} from 'react'
import {useIPC} from '../app-context'
import {NavMode, NavRoute, useNavigationDispatch} from './navigation'
import {encodeRouteToPath} from './route-encoding'

export function useNavigate(mode: NavMode = 'push') {
  const dispatch = useNavigationDispatch()
  const {invoke} = useIPC()
  return useCallback(
    (route: NavRoute) => {
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
      console.log('lfg', route)
      navigate(route)
    }
  }
}
