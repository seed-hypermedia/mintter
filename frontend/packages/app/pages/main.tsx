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
import GroupPage from './group'
import './polyfills'

var Feed = lazy(() => import('@mintter/app/pages/feed'))
var Account = lazy(() => import('@mintter/app/pages/account-page'))
var Contacts = lazy(() => import('@mintter/app/pages/contacts-page'))
var Publication = lazy(() => import('@mintter/app/pages/publication'))
var Draft = lazy(() => import('@mintter/app/pages/draft'))
var Settings = lazy(() => import('@mintter/app/pages/settings'))
var Comment = lazy(() => import('@mintter/app/pages/comment'))
var CommentDraft = lazy(() => import('@mintter/app/pages/comment-draft'))
var Explore = lazy(() => import('@mintter/app/pages/explore'))
var Favorites = lazy(() => import('@mintter/app/pages/favorites'))
var Export = lazy(() => import('@mintter/app/pages/export-page'))
var DeletedContent = lazy(() => import('@mintter/app/pages/deleted-content'))
var DraftRebase = lazy(() => import('@mintter/app/pages/draft-rebase'))

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
    titlebar = <TitleBar clean />
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
    case 'group':
      return {
        PageComponent: GroupPage,
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
    case 'export':
      return {
        PageComponent: Export,
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
