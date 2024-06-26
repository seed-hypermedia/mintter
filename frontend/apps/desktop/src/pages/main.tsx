import {useListen} from '@/app-context'

import {Launcher} from '@/components/launcher'
import {DraftStatusContext} from '@/models/draft-machine'
import {SidebarContextProvider} from '@/sidebar-context'
import {getRouteKey, useNavRoute} from '@/utils/navigation'
import {NavRoute} from '@/utils/routes'
import {useNavigate} from '@/utils/useNavigate'
import {getWindowType} from '@/utils/window-types'
import {SizableText, XStack, YStack} from '@shm/ui'
import {ReactElement, lazy, useMemo} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {AppErrorPage} from '../components/app-error'
import {AppSidebar} from '../components/sidebar'
import {TitleBar} from '../components/titlebar'
import {BaseLoading, NotFoundPage} from './base'
import {DocumentPlaceholder} from './document-placeholder'
import './polyfills'

var Feed = lazy(() => import('./feed'))
var Home = lazy(() => import('./home'))
var Settings = lazy(() => import('./settings'))
var Account = lazy(() => import('./account-page'))
var Contacts = lazy(() => import('./contacts-page'))
var Document = lazy(() => import('./document'))
var Draft = lazy(() => import('./draft'))
var Comment = lazy(() => import('./comment'))
var CommentDraft = lazy(() => import('./comment-draft'))
var Explore = lazy(() => import('./explore'))
var Favorites = lazy(() => import('./favorites'))
var DeletedContent = lazy(() => import('./deleted-content'))
var DraftRebase = lazy(() => import('./draft-rebase'))

export default function Main({className}: {className?: string}) {
  const navR = useNavRoute()
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
    titlebar = (
      <XStack
        bg="$transparent"
        h={26}
        ai="center"
        jc="center"
        className="window-drag"
      >
        <SizableText size="$1.5" fontWeight="bold">
          Settings
        </SizableText>
      </XStack>
    )
  } else if (windowType === 'deleted-content') {
    titlebar = <TitleBar clean cleanTitle="Review Deleted Content" />
  }

  if (windowType === 'main') {
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
    case 'home':
      return {
        PageComponent: Home,
        Fallback: BaseLoading,
      }
    case 'feed':
      return {
        PageComponent: Feed,
        Fallback: BaseLoading,
      }
    case 'explore':
      return {
        PageComponent: Explore,
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
    case 'document':
      return {
        PageComponent: Document,
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
    case 'deleted-content':
      return {
        PageComponent: DeletedContent,
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
    case 'favorites':
      return {
        PageComponent: Favorites,
        Fallback: BaseLoading,
      }
    case 'draft-rebase':
      return {
        PageComponent: DraftRebase,
        Fallback: BaseLoading,
      }
    default:
      return {
        PageComponent: NotFoundPage,
        Fallback: BaseLoading,
      }
  }
}
