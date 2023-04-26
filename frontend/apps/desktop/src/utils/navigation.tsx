import {Buffer} from 'buffer'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useReducer,
} from 'react'
import {openWindow} from './open-window'
import {decodeRouteFromPath, encodeRouteToPath} from './route-encoding'

global.Buffer = global.Buffer || Buffer

export type HomeRoute = {key: 'home'}
export type ConnectionsRoute = {key: 'connections'}
export type AccountRoute = {key: 'account'; accountId: string}
export type SitesRoute = {key: 'sites'}
export type SiteRoute = {key: 'site'; hostname: string}

type PublicationVersionsAccessory = {key: 'versions'}
type PublicationCitationsAccessory = {key: 'citations'}
type PublicationCommentsAccessory = {key: 'comments'}

export type PublicationRoute = {
  key: 'publication'
  documentId: string
  versionId?: string
  blockId?: string
  accessory?:
    | null
    | PublicationVersionsAccessory
    | PublicationCitationsAccessory
    | PublicationCommentsAccessory
}
export type DraftsRoute = {key: 'drafts'}
export type DraftRoute = {
  key: 'draft'
  draftId: string
  contextDocumentId?: string
}
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
export type BackplaceAction = {type: 'backplace'; route: NavRoute}
export type PopAction = {type: 'pop'}
export type ForwardAction = {type: 'forward'}
export type NavAction =
  | PushAction
  | ReplaceAction
  | BackplaceAction
  | PopAction
  | ForwardAction

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

    case 'backplace': {
      if (state.routeIndex === 0) {
        return {
          routes: [action.route],
          routeIndex: 0,
          lastAction: action.type,
        }
      }
      return {
        ...state,
        routes: [
          ...state.routes.slice(0, state.routes.length - 1),
          action.route,
        ],
        routeIndex: state.routeIndex,
        lastAction: action.type,
      }
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

export type NavMode = 'push' | 'replace' | 'spawn' | 'backplace'

export function useNavigate(mode: NavMode = 'push') {
  const dispatch = useNavigationDispatch()
  return (route: NavRoute) => {
    if (mode === 'spawn') {
      openWindow(encodeRouteToPath(route))
    } else if (mode === 'push') {
      dispatch({type: 'push', route})
    } else if (mode === 'replace') {
      dispatch({type: 'replace', route})
    } else if (mode === 'backplace') {
      dispatch({type: 'backplace', route})
    }
  }
}
