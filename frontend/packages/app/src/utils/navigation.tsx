import {Buffer} from 'buffer'
import {createContext, useContext} from 'react'
import {
  createHmId,
  UnpackedHypermediaId,
  unpackHmId,
} from '@mintter/shared/src/utils/entity-id-url'

// import type {GestureResponderEvent} from 'react-native'

global.Buffer = global.Buffer || Buffer

export type HomeRoute = {key: 'home'}
export type GlobalPublications = {key: 'all-publications'}
export type ContactsRoute = {key: 'contacts'}
export type AccountRoute = {key: 'account'; accountId: string}

export type EntityVersionsAccessory = {key: 'versions'}
export type PublicationCitationsAccessory = {key: 'citations'}
export type PublicationCommentsAccessory = {key: 'comments'}

export type GroupPublicationRouteContext = {
  key: 'group'
  groupId: string
  groupVersion?: string | undefined
  pathName: string | null
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
    | EntityVersionsAccessory
    | PublicationCitationsAccessory
    | PublicationCommentsAccessory
}
export type DraftsRoute = {key: 'drafts'}
export type DraftRoute = {
  key: 'draft'
  draftId?: string
  pubContext?: PublicationRouteContext
  contextRoute?: NavRoute
}
export type SettingsRoute = {key: 'settings'}
export type GroupsRoute = {key: 'groups'}
export type GroupRoute = {
  key: 'group'
  groupId: string
  version?: string
  accessory?: null | EntityVersionsAccessory
}
export type NavRoute =
  | HomeRoute
  | ContactsRoute
  | AccountRoute
  | SettingsRoute
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
  return route.key
}

const NavContext = createContext<null | NavigationContext>(null)

export function navStateReducer(state: NavState, action: NavAction): NavState {
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

export function simpleStringy(obj: any): string {
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

export function setAppNavDispatch(v: null | React.Dispatch<NavAction>) {
  appNavDispatch = v
}

export type AppWindowEvent =
  | 'back'
  | 'forward'
  | {key: 'connectPeer'; peer: string}

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

export function appRouteOfId(id: UnpackedHypermediaId): NavRoute | undefined {
  let navRoute: NavRoute | undefined = undefined
  if (id?.type === 'd') {
    navRoute = {
      key: 'publication',
      documentId: createHmId('d', id.eid),
      versionId: id.version || undefined,
      blockId: id.blockRef || undefined,
    }
  } else if (id?.type === 'g') {
    navRoute = {
      key: 'group',
      groupId: createHmId('g', id.eid),
    }
  } else if (id?.type === 'a') {
    navRoute = {
      key: 'account',
      accountId: id.eid,
    }
  }
  return navRoute
}

export function unpackHmIdWithAppRoute(
  hmId: string,
): (UnpackedHypermediaId & {navRoute?: NavRoute}) | null {
  const hmIds = unpackHmId(hmId)
  if (!hmIds) return null
  return {...hmIds, navRoute: appRouteOfId(hmIds)}
}
