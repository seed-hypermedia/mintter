import {useListen} from '@app/ipc'
import {
  NavRoute,
  useNavigate,
  useNavRoute,
  getRouteKey,
} from '@app/utils/navigation'
import {Box} from '@components/box'
import {TitleBar} from '@components/titlebar'
import {Button, Heading} from '@mintter/ui'
import {lazy, useMemo} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {NotFoundPage} from './base'
import './polyfills'

var PublicationList = lazy(() => import('@app/pages/publication-list-page'))
var DraftList = lazy(() => import('@app/pages/draft-list-page'))
var Account = lazy(() => import('@app/pages/account-page'))
var Connections = lazy(() => import('@app/pages/connections-page'))
var Site = lazy(() => import('@app/pages/site-page'))
var Publication = lazy(() => import('@app/pages/publication'))
var Draft = lazy(() => import('@app/pages/draft'))
var Settings = lazy(() => import('@app/pages/settings'))
var QuickSwitcher = lazy(() => import('@components/quick-switcher'))

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
        FallbackComponent={MainBoundary}
        onReset={() => {
          window.location.reload()
        }}
      >
        <PageComponent key={getRouteKey(navR)} />
        {!isSettings ? <QuickSwitcher /> : null}
      </ErrorBoundary>
    </>
  )
}

function MainBoundary({error, resetErrorBoundary}: FallbackProps) {
  return (
    <Box
      css={{
        background: '$base-background-normal',
        display: 'flex',
        minHeight: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      data-tauri-drag-region
    >
      <Box
        css={{
          background: '$base-background-subtle',
          boxShadow: '$menu',
          padding: '$4',
          display: 'flex',
          flexDirection: 'column',
          minWidth: '50vw',
          maxWidth: 565,
        }}
      >
        <Heading theme="red">App Error!</Heading>
        <Box
          css={{
            fontFamily: 'ui-monospace,monospace',
            padding: '$2',
            background: '$warning-background-normal',
            marginVertical: '$6',
          }}
        >
          {error.message}
        </Box>
        <Button onPress={resetErrorBoundary} alignSelf="flex-end">
          Reload
        </Button>
      </Box>
    </Box>
  )
}
