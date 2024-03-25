import {useListen} from '@mintter/app/app-context'

import {AppErrorPage} from '@mintter/app//components/app-error'
import {TitleBar} from '@mintter/app/components/titlebar'
import {getRouteKey, useNavRoute} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {YStack} from '@mintter/ui'
import {ReactElement, lazy, useMemo} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Launcher} from '../components/launcher'
import {AppSidebar} from '../components/sidebar'
import {DraftStatusContext} from '../models/draft-machine'
import {SidebarContextProvider} from '../src/sidebar-context'
import {NavRoute} from '../utils/routes'
import {getWindowType} from '../utils/window-types'
import {BaseLoading, NotFoundPage} from './base'
import {DocumentPlaceholder} from './document-placeholder'
import './polyfills'

var Feed = lazy(() => import('@mintter/app/pages/feed'))
var Documents = lazy(() => import('@mintter/app/pages/documents'))
var Account = lazy(() => import('@mintter/app/pages/account-page'))
var AccountFeed = lazy(() => import('@mintter/app/pages/account-feed'))
var Contacts = lazy(() => import('@mintter/app/pages/contacts-page'))
var Group = lazy(() => import('@mintter/app/pages/group'))
var GroupFeed = lazy(() => import('@mintter/app/pages/group-feed'))
var Groups = lazy(() => import('@mintter/app/pages/groups'))
var Publication = lazy(() => import('@mintter/app/pages/publication'))
var Draft = lazy(() => import('@mintter/app/pages/draft'))
var Settings = lazy(() => import('@mintter/app/pages/settings'))
var Comment = lazy(() => import('@mintter/app/pages/comment'))
var CommentDraft = lazy(() => import('@mintter/app/pages/comment-draft'))

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
  const windowType = getWindowType()
  let titlebar: ReactElement | null = null
  let sidebar: ReactElement | null = null
  let launcher: ReactElement | null = null
  if (windowType === 'main') {
    titlebar = <TitleBar />
    sidebar = <AppSidebar />
  } else if (windowType === 'settings') {
    titlebar = <TitleBar clean />
  }

  if (!isSettings) {
    launcher = <Launcher />
  }

  return (
    <YStack fullscreen className={className}>
      <SidebarContextProvider>
        <ErrorBoundary
          key={routeKey}
          FallbackComponent={AppErrorPage}
          onReset={() => {
            window.location.reload()
          }}
        >
          <DraftStatusContext.Provider>
            {titlebar}
            <PageComponent />
            {launcher}
          </DraftStatusContext.Provider>
        </ErrorBoundary>
        {sidebar}
      </SidebarContextProvider>
    </YStack>
  )
}

function getPageComponent(navRoute: NavRoute) {
  switch (navRoute.key) {
    case 'feed':
      return {
        PageComponent: Feed,
        Fallback: BaseLoading,
      }
    case 'documents':
      return {
        PageComponent: Documents,
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
    case 'group-feed':
      return {
        PageComponent: GroupFeed,
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
    case 'account-feed':
      return {
        PageComponent: AccountFeed,
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
    case 'comment':
      return {
        PageComponent: Comment,
        Fallback: BaseLoading,
      }
    case 'comment-draft':
      return {
        PageComponent: CommentDraft,
        Fallback: BaseLoading,
      }
    default:
      return {
        PageComponent: NotFoundPage,
        Fallback: BaseLoading,
      }
  }
}
