import {useListen} from '@mintter/app/src/app-context'

import {AppError} from '@mintter/app/src//components/app-error'
import {TitleBar} from '@mintter/app/src/components/titlebar'
import {
  getRouteKey,
  NavRoute,
  useNavigate,
  useNavRoute,
} from '@mintter/app/src/utils/navigation'
import {Spinner, YStack} from '@mintter/ui'
import {ProsemirrorAdapterProvider} from '@prosemirror-adapter/react'
import {lazy, Suspense, useMemo} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {NotFoundPage} from './base'
import {DocumentPlaceholder} from './document-placeholder'
import './polyfills'

var PublicationList = lazy(
  () => import('@mintter/app/src/pages/publication-list-page'),
)
const AllPublicationList = lazy(
  () => import('@mintter/app/src/pages/all-publications'),
)
var DraftList = lazy(() => import('@mintter/app/src/pages/draft-list-page'))
var Account = lazy(() => import('@mintter/app/src/pages/account-page'))
var Contacts = lazy(() => import('@mintter/app/src/pages/contacts-page'))
var Group = lazy(() => import('@mintter/app/src/pages/group'))
var Groups = lazy(() => import('@mintter/app/src/pages/groups'))
var Site = lazy(() => import('@mintter/app/src/pages/site-page'))
var Publication = lazy(() => import('@mintter/app/src/pages/publication'))
var Draft = lazy(() => import('@mintter/app/src/pages/draft'))
var Settings = lazy(() => import('@mintter/app/src/pages/settings'))
var QuickSwitcher = lazy(
  () => import('@mintter/app/src/components/quick-switcher'),
)

function BaseLoading() {
  return (
    <YStack padding="$6">
      <Spinner />
    </YStack>
  )
}

function getPageComponent(navRoute: NavRoute) {
  switch (navRoute.key) {
    case 'home':
      return {
        PageComponent: PublicationList,
        Fallback: BaseLoading,
      }
    case 'groups':
      return {
        PageComponent: Groups,
        Fallback: BaseLoading,
      }
    case 'group':
      return {
        PageComponent: Group,
        Fallback: BaseLoading,
      }
    case 'drafts':
      return {
        PageComponent: DraftList,
        Fallback: BaseLoading,
      }
    case 'site':
      return {
        PageComponent: Site,
        Fallback: BaseLoading,
      }
    case 'contacts':
      return {
        PageComponent: Contacts,
        Fallback: BaseLoading,
      }
    case 'account':
      return {
        PageComponent: Account,
        Fallback: BaseLoading,
      }
    case 'publication':
      return {
        PageComponent: Publication,
        Fallback: DocumentPlaceholder,
      }
    case 'draft':
      return {
        PageComponent: Draft,
        Fallback: DocumentPlaceholder,
      }
    case 'settings':
      return {
        PageComponent: Settings,
        Fallback: BaseLoading,
      }
    case 'all-publications':
      return {
        PageComponent: AllPublicationList,
        Fallback: BaseLoading,
      }
    default:
      return {
        PageComponent: NotFoundPage,
        Fallback: BaseLoading,
      }
  }
}

export default function Main() {
  const navR = useNavRoute()
  const isSettings = navR?.key == 'settings'
  const navigate = useNavigate()
  const {PageComponent, Fallback} = useMemo(
    () => getPageComponent(navR),
    [navR],
  )
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
    <YStack fullscreen>
      <TitleBar clean={isSettings} />
      <Suspense fallback={<Fallback />}>
        <ErrorBoundary
          FallbackComponent={AppError}
          onReset={() => {
            window.location.reload()
          }}
        >
          <PageComponent key={routeKey} />
          {!isSettings ? <QuickSwitcher /> : null}
        </ErrorBoundary>
      </Suspense>
    </YStack>
  )
}
