import {useListen} from '@mintter/app/app-context'

import {AppErrorPage} from '@mintter/app//components/app-error'
import {TitleBar} from '@mintter/app/components/titlebar'
import {getRouteKey, NavRoute, useNavRoute} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {Spinner, YStack} from '@mintter/ui'
import {lazy, useMemo} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {QuickSwitcher} from '../components/quick-switcher'
import {NotFoundPage} from './base'
import {DocumentPlaceholder} from './document-placeholder'
import './polyfills'

var PublicationList = lazy(
  () => import('@mintter/app/pages/publication-list-page'),
)
const AllPublicationList = lazy(
  () => import('@mintter/app/pages/all-publications'),
)
var DraftList = lazy(() => import('@mintter/app/pages/draft-list-page'))
var Account = lazy(() => import('@mintter/app/pages/account-page'))
var Contacts = lazy(() => import('@mintter/app/pages/contacts-page'))
var Group = lazy(() => import('@mintter/app/pages/group'))
var Groups = lazy(() => import('@mintter/app/pages/groups'))
var Publication = lazy(() => import('@mintter/app/pages/publication'))
var Draft = lazy(() => import('@mintter/app/pages/draft'))
var Settings = lazy(() => import('@mintter/app/pages/settings'))

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

export default function Main({className}: {className?: string}) {
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
    <YStack fullscreen className={className}>
      <ErrorBoundary
        key={routeKey}
        FallbackComponent={AppErrorPage}
        onReset={() => {
          window.location.reload()
        }}
      >
        <TitleBar clean={isSettings} />
        <PageComponent />
        {!isSettings ? <QuickSwitcher /> : null}
      </ErrorBoundary>
    </YStack>
  )
}
