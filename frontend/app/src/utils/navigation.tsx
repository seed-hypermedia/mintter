import {draftsClient} from '@app/api-clients'
import {invoke as tauriInvoke} from '@tauri-apps/api'
import {parse} from 'path'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useReducer,
} from 'react'
import {toast} from 'react-hot-toast'
import {openWindow} from './open-window'

export type HomeRoute = {key: 'home'}
export type ConnectionsRoute = {key: 'connections'}
export type AccountRoute = {key: 'account'; accountId: string}
export type SitesRoute = {key: 'sites'}
export type SiteRoute = {key: 'site'; hostname: string}
export type PublicationRoute = {
  key: 'publication'
  documentId: string
  versionId?: string
  blockId?: string
}
export type DraftsRoute = {key: 'drafts'}
export type DraftRoute = {key: 'draft'; documentId: string}
export type SettingsRoute = {key: 'settings'}

export type NavRoute =
  | HomeRoute
  | ConnectionsRoute
  | AccountRoute
  | SettingsRoute
  | SitesRoute
  | SiteRoute
  | PublicationRoute
  | DraftsRoute
  | DraftRoute

export type PushAction = {type: 'push'; route: NavRoute}
export type ReplaceAction = {type: 'replace'; route: NavRoute}
export type PopAction = {type: 'pop'}
export type ForwardAction = {type: 'forward'}
export type NavAction = PushAction | ReplaceAction | PopAction | ForwardAction

export type NavState = {
  routes: NavRoute[]
  routeIndex: number
}
export type NavigationContext = {
  state: NavState
  dispatch: (action: NavAction) => void
}

const NavContext = createContext<null | NavigationContext>(null)

function navStateReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'push':
      return {
        routes: [...state.routes.slice(0, state.routeIndex + 1), action.route],
        routeIndex: state.routeIndex + 1,
      }
    case 'replace':
      return {
        routes: [...state.routes.slice(0, state.routeIndex), action.route],
        routeIndex: state.routeIndex,
      }
    case 'pop': {
      if (state.routeIndex === 0) return state
      return {
        ...state,
        routeIndex: state.routeIndex - 1,
      }
    }
    case 'forward':
      return {
        routes: state.routes,
        routeIndex: Math.min(state.routeIndex + 1, state.routes.length - 1),
      }
    default:
      return state
  }
}

const initRouteEncoded = window.location.pathname.slice(1)

function parseInitRoute(initRoute: string): NavRoute {
  return JSON.parse(
    Buffer.from(
      initRoute.replaceAll('_', '+').replaceAll('-', '='),
      'base64',
    ).toString('utf8'),
  )
}

let initRoute: NavRoute = {key: 'home'}
try {
  initRoute = parseInitRoute(initRouteEncoded)
} catch (e) {
  console.error('🔥 Error parsing initial route! ', e)
}

export function NavigationProvider({children}: {children: ReactNode}) {
  // useEffect(() => {
  //   alert('window.location: ' + window.location.pathname)
  // }, [window.location.href])
  const [navState, dispatch] = useReducer(navStateReducer, {
    routes: [initRoute],
    routeIndex: 0,
  })
  console.log('-- nav state', navState)
  return (
    <NavContext.Provider
      value={{
        state: navState,
        dispatch,
      }}
    >
      {children}
    </NavContext.Provider>
  )
}

export function useNavRoute() {
  const nav = useContext(NavContext)
  if (!nav)
    throw new Error('useNavRoute must be used within a NavigationProvider')
  return nav.state.routes[nav.state.routeIndex]
}

export function useNavigationState() {
  const nav = useContext(NavContext)
  if (!nav)
    throw new Error('useNavigation must be used within a NavigationProvider')
  return nav.state
}

export function useNavigationDispatch() {
  const nav = useContext(NavContext)
  if (!nav)
    throw new Error('useNavigation must be used within a NavigationProvider')
  return nav.dispatch
}

export type NavMode = 'push' | 'replace' | 'spawn'

export function useNavigate(mode: NavMode = 'push') {
  const dispatch = useNavigationDispatch()
  return (route: NavRoute) => {
    if (mode === 'spawn') {
      openWindow(
        `/${Buffer.from(JSON.stringify(route))
          .toString('base64')
          .replaceAll('=', '-')
          .replaceAll('+', '_')}`,
      )
    } else {
      dispatch({type: mode === 'replace' ? 'replace' : 'push', route})
    }
  }
}

export function useNavigationActions() {
  const navigate = useNavigate()
  const spawn = useNavigate('spawn')
  function openNewDraft(newWindow = true) {
    draftsClient
      .createDraft({})
      .then((doc) => {
        tauriInvoke('emit_all', {
          event: 'new_draft',
        })
        if (newWindow) {
          spawn({key: 'draft', documentId: doc.id})
        } else {
          navigate({key: 'draft', documentId: doc.id})
        }
      })
      .catch(() => {
        toast.error('Failed to create new draft')
      })
  }
  return {
    openNewDraft,
  }
}

export function openPublication(
  docId: string,
  version?: string,
  blockId?: string,
) {
  let path = `/p/${docId}`
  if (version) {
    path += `/${version}`
    if (blockId) {
      path += `/${blockId}`
    }
  }
  openWindow(path)
}
