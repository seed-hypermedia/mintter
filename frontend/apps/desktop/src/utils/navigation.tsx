import {draftsClient} from '@app/api-clients'
import {queryKeys} from '@app/models/query-keys'
import {appInvalidateQueries} from '@app/query-client'
import {Buffer} from 'buffer'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useReducer,
} from 'react'
import {toast} from 'react-hot-toast'
import {openWindow} from './open-window'
import {Document} from '@mintter/shared'

global.Buffer = global.Buffer || Buffer

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
  lastAction: NavAction['type']
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
        lastAction: action.type,
      }
    case 'replace':
      return {
        routes: [...state.routes.slice(0, state.routeIndex), action.route],
        routeIndex: state.routeIndex,
        lastAction: action.type,
      }
    case 'pop': {
      if (state.routeIndex === 0) return state
      return {
        ...state,
        routeIndex: state.routeIndex - 1,
        lastAction: action.type,
      }
    }
    case 'forward':
      return {
        routes: state.routes,
        routeIndex: Math.min(state.routeIndex + 1, state.routes.length - 1),
        lastAction: action.type,
      }
    default:
      return state
  }
}

const initRouteEncoded = window.location.pathname.slice(1)
const homeRoute: HomeRoute = {key: 'home'}
let initRoute: NavRoute = homeRoute
try {
  initRoute = decodeRouteFromPath(initRouteEncoded)
} catch (e) {
  console.error('Error parsing initial route! ', e)
}

function encodeRouteToPath(route: NavRoute): string {
  return `/${Buffer.from(JSON.stringify(route))
    .toString('base64')
    .replaceAll('=', '-')
    .replaceAll('+', '_')}`
}

function decodeRouteFromPath(initRoute: string): NavRoute {
  return JSON.parse(
    Buffer.from(
      initRoute.replaceAll('_', '+').replaceAll('-', '='),
      'base64',
    ).toString('utf8'),
  )
}

export function NavigationProvider({
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
  const {lastAction, routes, routeIndex} = navState
  const activeRoute = routes[routeIndex]
  useEffect(() => {
    const newPath = encodeRouteToPath(activeRoute)
    window.history.replaceState(null, '', newPath)
  }, [activeRoute, lastAction])

  useEffect(() => {
    console.log(`=== nav state
  ${routes.map((r, i) => {
    const {key, ...rest} = r
    return `${i === routeIndex ? '🟢' : '⚪️'} ${key} ${JSON.stringify(rest)}
    `
  })}`)
  }, [routes, routeIndex])

  // go to pub with pending edit
  // resume editing
  // press forward
  // draft changes?!

  // start editing pub, add content
  // second time resume editing, doesnt work

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
      openWindow(encodeRouteToPath(route))
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
      .then((doc: Document) => {
        appInvalidateQueries([queryKeys.GET_DRAFT_LIST])
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
