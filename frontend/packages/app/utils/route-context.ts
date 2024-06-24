import {unpackHmId} from '@shm/shared'
import {useNavRoute} from './navigation'
import {BaseEntityRoute, NavRoute} from './routes'
import {useNavigate} from './useNavigate'

export function getRouteParentContext(route: NavRoute) {
  if (route.key == 'document') {
    return route.context
  }
  if (route.key == 'account') {
    return route.context
  }
  return undefined
}

export function getRouteContext(
  route: NavRoute,
  blockIdOfRoute?: string,
): BaseEntityRoute[] {
  let contextRoute = getThisRouteContext(route)
  if (contextRoute && blockIdOfRoute) {
    contextRoute = {
      ...contextRoute,
      blockId: blockIdOfRoute,
    }
  }
  const context: BaseEntityRoute[] = [
    ...(getRouteParentContext(route) || []),
    ...(contextRoute ? [contextRoute] : []),
  ]
  return context
}

export function useOpenInContext() {
  const route = useNavRoute()
  const navigate = useNavigate()
  return (hmUrl, parentBlockId) => {
    const context = getRouteContext(route, parentBlockId)
    const id = unpackHmId(hmUrl)
    if (!id) return
    if (id.type == 'd') {
      navigate({
        key: 'document',
        documentId: id.qid,
        versionId: id.version || undefined,
        context,
      })
    } else if (id.type == 'a') {
      navigate({
        key: 'account',
        accountId: id.eid,
        context,
      })
    }
  }
}

function getThisRouteContext(route: NavRoute): BaseEntityRoute | undefined {
  if (route.key == 'document') {
    const pubRoute = {...route}
    delete pubRoute.context
    return pubRoute
  }
  if (route.key == 'account') {
    const accountRoute = {...route}
    delete accountRoute.context
    delete accountRoute.tab
    return accountRoute
  }
  return undefined
}
