import {useDraftTitle} from '@mintter/app/models/documents'
import {usePublicationVariant} from '@mintter/app/models/publication'
import {useNavRoute} from '@mintter/app/utils/navigation'
import {getDocumentTitle} from '@mintter/shared'
import {
  Book,
  ButtonText,
  Contact,
  ErrorIcon,
  FontSizeTokens,
  Home,
  SizableText,
  Spinner,
  TitleText,
  XStack,
  styled,
} from '@mintter/ui'
import {Sparkles, Star} from '@tamagui/lucide-icons'
import {useEffect, useMemo, useRef} from 'react'
import {useAccount} from '../models/accounts'
import {useEntitiesContent, useEntityRoutes} from '../models/entities'
import {useGroup} from '../models/groups'
import {useFixedDraftTitle} from '../pages/draft'
import {
  AccountRoute,
  DraftRoute,
  GroupFeedRoute,
  GroupRoute,
  NavRoute,
  PublicationRoute,
} from '../utils/routes'
import {useNavigate} from '../utils/useNavigate'
import {observeSize} from './app-embeds'
import {getItemDetails} from './sidebar-neo'

export function TitleContent({size = '$4'}: {size?: FontSizeTokens}) {
  const route = useNavRoute()

  useEffect(() => {
    async function getTitleOfRoute(route: NavRoute): Promise<string> {
      if (route.key === 'contacts') return 'Contacts'
      return ''
    }
    getTitleOfRoute(route).then((title) => {
      // we set the window title so the window manager knows the title in the Window menu
      // @ts-ignore
      window.document.title = title
      // window.windowInfo.setTitle(title)
    })
  }, [route])

  if (route.key === 'feed') {
    let subtitle: string | null = null
    if (route.tab === 'all') {
      subtitle = '- All Content'
    } else {
      subtitle = '- Trusted Content'
    }
    return (
      <>
        <Home size={12} />
        <TitleText size={size} fontWeight="bold" data-testid="titlebar-title">
          Home Feed
        </TitleText>
        <SizableText>{subtitle}</SizableText>
      </>
    )
  }
  if (route.key === 'contacts') {
    return (
      <>
        <Contact size={12} />
        <TitleText data-testid="titlebar-title" size={size}>
          Contacts
        </TitleText>
      </>
    )
  }
  if (route.key === 'explore') {
    return (
      <>
        <Sparkles size={12} />
        <TitleText size={size}>
          Explore: {route.tab === 'docs' ? 'Documents' : 'Groups'}
        </TitleText>
      </>
    )
  }
  if (route.key === 'favorites') {
    return (
      <>
        <Star size={12} />
        <TitleText size={size}>Favorites</TitleText>
      </>
    )
  }

  if (
    route.key === 'group' ||
    route.key === 'account' ||
    route.key === 'publication'
  ) {
    return <BreadcrumbTitle route={route} />
  }
  if (route.key === 'draft') {
    return (
      <>
        {/* <PageContextButton />
        <Slash /> */}
        <DraftTitle route={route} />
      </>
    )
  }
  return null
}

function BreadcrumbTitle({
  route,
}: {
  route: PublicationRoute | GroupRoute | AccountRoute
}) {
  const entityRoutes = useEntityRoutes(route)
  const entityContents = useEntitiesContent(entityRoutes)

  const routeDetails = useMemo(
    () =>
      entityRoutes.map((route, routeIndex) => {
        if (route.key === 'draft') return null // draft should not appear in context
        const details = getItemDetails(
          entityContents?.find((c) => c.route === route)?.entity,
          route.blockId,
        )
        if (!details) return null
        return {
          ...details,
          route: {
            ...route,
            context: [...entityRoutes.slice(0, routeIndex)],
          },
          onWidth: (width) => {
            // console.log('width of el', route, width)
          },
        }
      }),
    [entityRoutes, entityContents],
  )
  const container = useRef(null)
  useEffect(() => {
    if (!container.current) return
    return observeSize(container.current, ({width}) => {
      // console.log('width of container', width)
    })
  }, [])
  return (
    <XStack gap="$2" f={1} marginRight={'$4'} ref={container}>
      {routeDetails.map((details, detailsIndex) => {
        if (!details) return null
        return (
          <>
            <BreadcrumbItem
              details={details}
              isActive={detailsIndex === routeDetails.length - 1}
              onWidth={details.onWidth}
            />
            {detailsIndex < routeDetails.length - 1 ? (
              <BreadcrumbSeparator />
            ) : null}
          </>
        )
      })}
    </XStack>
  )
}
function BreadcrumbSeparator() {
  return (
    <TitleText size="$4" color="$color10">
      {' / '}
    </TitleText>
  )
}

const TitleEllipsisLength = 20

function BreadcrumbItem({
  details,
  isActive,
  onWidth,
}: {
  details: ReturnType<typeof getItemDetails> & {route: NavRoute}
  isActive: boolean
  onWidth: (width: number) => void
}) {
  const navigate = useNavigate()
  const titleEl = useRef(null)
  useEffect(() => {
    if (!titleEl.current) return
    return observeSize(titleEl.current, (a) => {
      onWidth(a.width)
    })
  }, [])
  if (!details?.title) return null
  if (isActive) {
    return (
      <TitleText ref={titleEl} fontWeight="bold">
        {details.title}
      </TitleText>
    )
  }
  const ellipsizedTitle =
    details.title.length > TitleEllipsisLength
      ? `${details.title.slice(0, TitleEllipsisLength)}...`
      : details.title
  return (
    <TitleTextButton
      ref={titleEl}
      className="no-window-drag"
      onPress={() => {
        navigate(details.route)
      }}
      fontWeight={isActive ? 'bold' : 'normal'}
    >
      {ellipsizedTitle}
    </TitleTextButton>
  )
}

export const TitleTextButton = styled(ButtonText, {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  name: 'TitlebarLink',
  color: '$color12',
  fontSize: '$4',
  userSelect: 'none',
  padding: 0,
  margin: 0,
  textTransform: 'none',
  cursor: 'pointer',
  hoverStyle: {
    textDecorationLine: 'underline',
  },
})

function AccountProfileTitle({route}: {route: AccountRoute}) {
  const account = useAccount(route.accountId)
  let windowLabel = 'Profile'
  if (route.tab === 'documents') {
    windowLabel = 'Documents'
  } else if (route.tab === 'groups') {
    windowLabel = 'Groups'
  } else if (route.tab === 'activity') {
    windowLabel = 'Activity'
  }
  const title = account.data?.profile?.alias
    ? `Account ${windowLabel}: ${account.data.profile.alias}`
    : `Account ${windowLabel}`
  useWindowTitle(title)

  return <TitleText>{title}</TitleText>
}

function GroupTitle({route}: {route: GroupRoute | GroupFeedRoute}) {
  const group = useGroup(route.groupId)
  useWindowTitle(group.data?.title ? `Group: ${group.data?.title}` : undefined)
  if (!group.data) return null

  return (
    <XStack ai="center" gap="$2">
      <Book size={16} />
      <SizableText>{group.data.title}</SizableText>
    </XStack>
  )
}

export function Title({size}: {size?: FontSizeTokens}) {
  return (
    <XStack
      gap="$2"
      alignItems="flex-start"
      marginVertical={0}
      paddingHorizontal="$4"
      justifyContent="flex-start"
      ai="center"
      width="100%"
    >
      <TitleContent size={size} />
    </XStack>
  )
}

function PublicationTitle({
  route,
  size = '$4',
}: {
  route: PublicationRoute
  size?: FontSizeTokens
}) {
  let pub = usePublicationVariant({
    documentId: route.documentId,
    versionId: route.versionId,
    variants: route.variants,
    enabled: !!route.documentId,
  })

  useWindowTitle(
    pub.data?.publication?.document
      ? `Publication: ${getDocumentTitle(pub.data?.publication?.document)}`
      : undefined,
  )

  if (pub.error) {
    return <ErrorIcon />
  }
  const document = pub.data?.publication?.document
  return (
    <>
      <TitleText fontWeight="bold" data-testid="titlebar-title" size={size}>
        {pub.isInitialLoading ? <Spinner /> : getDocumentTitle(document)}
      </TitleText>
    </>
  )
}

function DraftTitle({
  route,
  size = '$4',
}: {
  route: DraftRoute
  size?: FontSizeTokens
}) {
  const title = useDraftTitle({
    documentId: route.draftId,
  })
  const realTitle = title ?? 'Untitled Document'
  const fixedTitle = useFixedDraftTitle(route)
  const displayTitle = fixedTitle || realTitle
  useWindowTitle(displayTitle ? `Draft: ${displayTitle}` : undefined)
  return (
    <>
      <TitleText data-testid="titlebar-title" size={size}>
        {displayTitle}
      </TitleText>
    </>
  )
}

function useWindowTitle(title?: string) {
  useEffect(() => {
    if (title) {
      window.document.title = title
    }
  }, [title])
}
