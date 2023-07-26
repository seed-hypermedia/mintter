import {useListen} from '@mintter/app/src/app-context'

import {AppError} from '@mintter/app/src//components/app-error'
import {TitleBar} from '@mintter/app/src/components/titlebar'
import {
  getRouteKey,
  NavRoute,
  useNavigate,
  useNavRoute,
} from '@mintter/app/src/utils/navigation'
import {YStack} from '@mintter/ui'
import {ProsemirrorAdapterProvider} from '@prosemirror-adapter/react'
import {lazy, useMemo} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {NotFoundPage} from './base'
import './polyfills'

var PublicationList = lazy(
  () => import('@mintter/app/src/pages/publication-list-page'),
)
var DraftList = lazy(() => import('@mintter/app/src/pages/draft-list-page'))
var Account = lazy(() => import('@mintter/app/src/pages/account-page'))
var Connections = lazy(() => import('@mintter/app/src/pages/connections-page'))
var Site = lazy(() => import('@mintter/app/src/pages/site-page'))
var Publication = lazy(() => import('@mintter/app/src/pages/publication'))
var Draft = lazy(() => import('@mintter/app/src/pages/draft'))
var Settings = lazy(() => import('@mintter/app/src/pages/settings'))
var QuickSwitcher = lazy(
  () => import('@mintter/app/src/components/quick-switcher'),
)

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
    <YStack position="absolute" top={0} left={0} width="100%" height="100%">
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
    </YStack>
  )
}
