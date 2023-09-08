import {Buffer} from 'buffer'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import {decodeRouteFromPath, encodeRouteToPath} from './route-encoding'
import {useIPC} from '@mintter/app/src/app-context'
import {GestureResponderEvent} from 'react-native'

global.Buffer = global.Buffer || Buffer

export type HomeRoute = {key: 'home'}
export type GlobalPublications = {key: 'all-publications'}
export type ContactsRoute = {key: 'contacts'}
export type AccountRoute = {key: 'account'; accountId: string}
export type SitesRoute = {key: 'sites'}
export type SiteRoute = {key: 'site'; hostname: string}

type PublicationVersionsAccessory = {key: 'versions'}
type PublicationCitationsAccessory = {key: 'citations'}
type PublicationCommentsAccessory = {key: 'comments'}
export type GroupPublicationRouteContext = {
  key: 'group'
  groupId: string
  pathName: string
}
export type PublicationRouteContext =
  | null
  | {key: 'trusted'}
  | GroupPublicationRouteContext

export type PublicationRoute = {
  key: 'publication'
  documentId: string
  versionId?: string
  pubContext?: PublicationRouteContext
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
  pubContext?: PublicationRouteContext
  contextRoute?: NavRoute
}
export type SettingsRoute = {key: 'settings'}
export type GroupsRoute = {key: 'groups'}
export type GroupRoute = {
  key: 'group'
  groupId: string
}
export type NavRoute =
  | HomeRoute
  | ContactsRoute
  | AccountRoute
  | SettingsRoute
  | SitesRoute
  | SiteRoute
  | GroupsRoute
  | GroupRoute
  | PublicationRoute
  | DraftsRoute
  | DraftRoute
  | GlobalPublications

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

export function getRouteKey(route: NavRoute): string {
  if (route.key === 'account') return `account:${route.accountId}`
  if (route.key === 'draft') return `draft:${route.draftId}`
  if (route.key === 'publication') return `pub:${route.documentId}` // version changes and publication page remains mounted
  if (route.key === 'site') return `site:${route.hostname}`
  return route.key
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
  if (initRouteEncoded === '') {
    initRoute = homeRoute
  } else {
    initRoute = decodeRouteFromPath(initRouteEncoded)
  }
} catch (e) {
  console.log(`Initial Route: "${initRouteEncoded}"`)
  console.error('Error parsing initial route! ', e)
}

function simpleStringy(obj: any): string {
  if (Array.isArray(obj)) {
    return obj.map(simpleStringy).join(', ')
  }
  if (obj === null) return 'null'
  if (typeof obj === 'string') return obj
  if (typeof obj === 'number') return String(obj)
  if (typeof obj === 'boolean') return String(obj)
  if (typeof obj === 'object') {
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${simpleStringy(v)}`)
      .join(', ')
  }
  return '?'
}

let appNavDispatch: null | React.Dispatch<NavAction> = null

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
  const {send} = useIPC()
  const {lastAction, routes, routeIndex} = navState
  const activeRoute = routes[routeIndex]
  useEffect(() => {
    send('windowRoute', activeRoute)
  }, [activeRoute, lastAction, send])

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
    appNavDispatch = dispatch
    return () => {
      appNavDispatch = null
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

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function dispatchAppNavigation(action: NavAction) {
  if (!appNavDispatch) {
    throw new Error('App Navigation not ready or available')
  }
  return appNavDispatch(action)
}

export function useNavigation() {
  const nav = useContext(NavContext)
  if (!nav)
    throw new Error('useNavRoute must be used within a NavigationProvider')
  return nav
}

export const NavContextProvider = NavContext.Provider

export function useNavRoute() {
  const nav = useContext(NavContext)
  if (!nav)
    throw new Error('useNavRoute must be used within a NavigationProvider')
  return nav.state.routes[nav.state.routeIndex] || {key: 'home'}
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
  const {invoke} = useIPC()
  function openRouteWindow(route: NavRoute) {
    const path = encodeRouteToPath(route)
    invoke('plugin:window|open', {path})
  }
  return (route: NavRoute) => {
    if (mode === 'spawn') {
      openRouteWindow(route)
    } else if (mode === 'push') {
      dispatch({type: 'push', route})
    } else if (mode === 'replace') {
      dispatch({type: 'replace', route})
    } else if (mode === 'backplace') {
      dispatch({type: 'backplace', route})
    }
  }
}

export function useClickNavigate() {
  const navigate = useNavigate()
  const spawn = useNavigate('spawn')

  return (route: NavRoute, event: GestureResponderEvent) => {
    event.preventDefault()
    event.stopPropagation()
    // @ts-expect-error
    if (event.metaKey || event.shiftKey) {
      spawn(route)
    } else {
      navigate(route)
    }
  }
}
