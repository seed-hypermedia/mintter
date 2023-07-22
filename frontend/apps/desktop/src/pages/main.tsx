import {useListen} from '@mintter/app'
import {AppError} from '@app/root'
import {
  getRouteKey,
  NavRoute,
  useNavigate,
  useNavRoute,
} from '@app/utils/navigation'
import {TitleBar} from '@app/components/titlebar'
import {ProsemirrorAdapterProvider} from '@prosemirror-adapter/react'
import {lazy, useMemo} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {NotFoundPage} from './base'
import './polyfills'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'

var PublicationList = lazy(() => import('@app/pages/publication-list-page'))
var DraftList = lazy(() => import('@app/pages/draft-list-page'))
var Account = lazy(() => import('@app/pages/account-page'))
var Connections = lazy(() => import('@app/pages/connections-page'))
var Site = lazy(() => import('@app/pages/site-page'))
var Publication = lazy(() => import('@app/pages/publication'))
var Draft = lazy(() => import('@app/pages/draft'))
var Settings = lazy(() => import('@app/pages/settings'))
var QuickSwitcher = lazy(() => import('@app/components/quick-switcher'))

function getPageComponent(navRoute: NavRoute) {
  switch (navRoute.key) {
    case 'home':
      return PublicationList
    case 'drafts':
      return DraftList
    case 'site':
      return Site
    case 'connections':
      return Connections
    case 'account':
      return Account
    case 'publication':
      return Publication
    case 'draft':
      return Draft
    case 'settings':
      return Settings
    default:
      return NotFoundPage
  }
}

export default function Main() {
  const navR = useNavRoute()
  const isSettings = navR.key == 'settings'
  const navigate = useNavigate()
  const PageComponent = useMemo(() => getPageComponent(navR), [navR.key])
  const routeKey = useMemo(() => getRouteKey(navR), [navR])
  useListen<NavRoute>(
    'open_route',
    (event) => {
      const route = event.payload
      navigate(route)
    },
    [navigate],
  )
  return (
    <>
      <TitleBar clean={isSettings} />
      <ErrorBoundary
        FallbackComponent={AppError}
        onReset={() => {
          window.location.reload()
        }}
      >
        <ProsemirrorAdapterProvider>
          <PageComponent key={routeKey} />
        </ProsemirrorAdapterProvider>
        {!isSettings ? <QuickSwitcher /> : null}
        {/* <ReactQueryDevtools /> */}
      </ErrorBoundary>
    </>
  )
}
