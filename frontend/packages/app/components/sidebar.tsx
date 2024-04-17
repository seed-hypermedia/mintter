import {
  AuthorVariant,
  GroupVariant,
  HMBlockNode,
  HMDocument,
  UnpackedHypermediaId,
  getDocumentTitle,
} from '@mintter/shared'
import {Home} from '@mintter/ui'
import {
  Book,
  Contact,
  FileText,
  Hash,
  Sparkles,
  Star,
} from '@tamagui/lucide-icons'
import {memo, useMemo} from 'react'
import {useAccount, useMyAccount} from '../models/accounts'
import {usePublication, usePublicationEmbeds} from '../models/documents'
import {useGroup, useGroupFrontPub} from '../models/groups'
import {
  useProfilePublication,
  usePublicationVariant,
} from '../models/publication'
import {appRouteOfId, useNavRoute} from '../utils/navigation'
import {getRouteContext} from '../utils/route-context'
import {
  AccountRoute,
  BaseEntityRoute,
  GroupRoute,
  NavRoute,
  PublicationRoute,
} from '../utils/routes'
import {useNavigate} from '../utils/useNavigate'
import {
  GenericSidebarContainer,
  SidebarDivider,
  SidebarItem,
  activeDocOutline,
  getDocOutline,
} from './sidebar-base'

export const AppSidebar = memo(MainAppSidebar)

export function MainAppSidebar() {
  const route = useNavRoute()
  const navigate = useNavigate()
  const replace = useNavigate('replace')
  const account = useMyAccount()

  const pubRoute = route.key === 'publication' ? route : null
  const pubAuthorVariants = pubRoute?.variants?.filter(
    (variant) => variant.key === 'author',
  ) as AuthorVariant[] | undefined
  const pubGroupVariants = pubRoute?.variants?.filter(
    (variant) => variant.key === 'group',
  ) as GroupVariant[] | undefined
  if (pubGroupVariants && pubGroupVariants.length > 1) {
    throw new Error('Multiple group variants not currently supported')
  }
  if (
    pubAuthorVariants &&
    pubAuthorVariants.length > 1 &&
    pubGroupVariants &&
    pubGroupVariants.length > 1
  ) {
    throw new Error(
      'Combined author and group variants not currently supported',
    )
  }
  const myAccount = useMyAccount()
  const accountRoute = route.key === 'account' ? route : null
  const myAccountRoute =
    accountRoute && accountRoute?.accountId === myAccount.data?.id
      ? accountRoute
      : null
  const activeBlock = accountRoute?.blockId
  const myProfileDoc = usePublication(
    {
      id: myAccount.data?.profile?.rootDocument,
    },
    {
      keepPreviousData: false,
    },
  )
  const myProfileDocEmbeds = usePublicationEmbeds(
    myProfileDoc.data,
    !!myProfileDoc.data,
    {skipCards: true},
  )
  const frontDocOutline = getDocOutline(
    myProfileDoc?.data?.document?.children || [],
    myProfileDocEmbeds,
  )
  const {outlineContent: myAccountOutlineContent, isBlockActive} =
    activeDocOutline(
      frontDocOutline,
      activeBlock,
      myProfileDocEmbeds,
      (blockId) => {
        const myAccountId = myAccount.data?.id
        if (!myAccountId) return
        const accountRoute =
          route.key == 'account' && myAccountId === route.accountId
            ? route
            : null
        if (!accountRoute) {
          navigate({
            key: 'account',
            accountId: myAccountId,
            blockId,
          })
        } else {
          replace({
            ...accountRoute,
            blockId,
          })
        }
      },
      navigate,
    )
  return (
    <GenericSidebarContainer>
      <SidebarItem
        active={route.key == 'feed'}
        onPress={() => {
          navigate({key: 'feed', tab: 'trusted'})
        }}
        title="Home Feed"
        bold
        icon={Home}
      />
      <SidebarItem
        active={route.key == 'explore'}
        onPress={() => {
          navigate({key: 'explore', tab: 'docs'})
        }}
        title="Explore Content"
        bold
        icon={Sparkles}
        rightHover={[]}
      />
      <SidebarItem
        active={route.key == 'favorites'}
        onPress={() => {
          navigate({key: 'favorites'})
        }}
        title="Favorites"
        bold
        icon={Star}
        rightHover={[]}
      />
      <SidebarItem
        active={route.key == 'contacts'}
        onPress={() => {
          navigate({key: 'contacts'})
        }}
        icon={Contact}
        title="Contacts"
        bold
      />
      <SidebarDivider />
      {/* {account.data && (
        <MyAccountItem
          active={
            route.key == 'account' &&
            route.accountId == myAccount.data?.id &&
            !isBlockActive
          }
          account={account.data}
          onRoute={navigate}
        />
      )} */}
      {/* {myAccountOutlineContent} */}
      {myAccount.data?.id && (
        <AccountRouteOutline
          route={
            myAccountRoute || {key: 'account', accountId: myAccount.data?.id}
          }
        />
      )}

      {myAccountRoute ? null : (
        <RouteOutline route={route} myAccountId={myAccount.data?.id} />
      )}
    </GenericSidebarContainer>
  )
}

function RouteOutline({
  route,
  myAccountId,
}: {
  route: NavRoute
  myAccountId: string | undefined
}) {
  if (route.key === 'account') {
    if (route.accountId === myAccountId) return null
    return (
      <>
        <SidebarDivider />
        <AccountRouteOutline route={route} />
      </>
    )
  }
  if (route.key === 'publication') {
    return (
      <>
        <SidebarDivider />
        <PublicationRouteOutline route={route} />
      </>
    )
  }
  if (route.key === 'group') {
    return (
      <>
        <SidebarDivider />
        <GroupRouteOutline route={route} />
      </>
    )
  }
  return null
}

function useNavigateBlock() {
  const route = useNavRoute()
  const replace = useNavigate('replace')
  const navigate = useNavigate()
  return (
    blockId: string,
    entityId?: UnpackedHypermediaId,
    parentBlockId?: string,
  ) => {
    const context = getRouteContext(route, parentBlockId)
    if (entityId) {
      let destRoute = appRouteOfId(entityId)
      if (destRoute?.key === 'publication') {
        navigate({
          ...destRoute,
          context,
          blockId,
        })
      } else if (destRoute?.key === 'group') {
        navigate({
          ...destRoute,
          context,
          blockId,
        })
      } else if (destRoute?.key === 'account') {
        navigate({
          ...destRoute,
          context,
          blockId,
        })
      } else if (destRoute) {
        navigate(destRoute)
      }
    } else if (route.key === 'publication') {
      replace({
        ...route,
        blockId,
      })
    } else if (route.key === 'group') {
      replace({
        ...route,
        blockId,
      })
    } else if (route.key === 'account') {
      replace({
        ...route,
        blockId,
      })
    }
  }
}

function useContextItems(context: BaseEntityRoute[] | undefined) {
  return (
    context?.map((contextRoute, index) => {
      if (contextRoute.key === 'account')
        return (
          <AccountContextItem
            route={contextRoute}
            getContext={() => context.slice(0, index)}
          />
        )
      if (contextRoute.key === 'publication')
        return (
          <PublicationContextItem
            route={contextRoute}
            getContext={() => context.slice(0, index)}
          />
        )
      if (contextRoute.key === 'group')
        return (
          <GroupContextItem
            route={contextRoute}
            getContext={() => context.slice(0, index)}
          />
        )
      return null
    }) || null
  )
}

function useIntermediateContext(
  route: BaseEntityRoute,
  document: HMDocument | undefined,
  blockId: string | undefined,
) {
  const headings = useMemo(() => {
    if (!blockId || !document) return null
    let blockHeadings: null | {id: string; text: string}[] = null
    if (!blockId) return []
    function findBlock(
      nodes: HMBlockNode[] | undefined,
      parentHeadings: {id: string; text: string}[],
    ) {
      return nodes?.find((blockNode) => {
        if (!blockId) return null
        if (blockNode.block.id === blockId) {
          blockHeadings = parentHeadings
          return true
        }
        if (blockNode.children?.length) {
          return findBlock(blockNode.children, [
            ...parentHeadings,
            {id: blockNode.block.id, text: blockNode.block.text},
          ])
        }
        return false
      })
    }
    findBlock(document.children, [])
    return blockHeadings as null | {id: string; text: string}[]
  }, [document, blockId])
  const navigate = useNavigate()
  return headings?.map((heading) => {
    return (
      <SidebarItem
        icon={Hash}
        title={heading.text}
        onPress={() => {
          navigate({...route, blockId: heading.id})
        }}
      />
    )
  })
}

function AccountContextItem({
  route,
  getContext,
}: {
  route: AccountRoute
  getContext: () => BaseEntityRoute[]
}) {
  const account = useAccount(route.accountId)
  const pub = useProfilePublication(route.accountId)
  const navigate = useNavigate()
  return (
    <>
      <SidebarItem
        title={account.data?.profile?.alias || 'Unknown Account'}
        icon={Contact}
        onPress={() => {
          navigate({...route, blockId: undefined})
        }}
      />
      {useIntermediateContext(
        route,
        pub.data?.publication?.document,
        route.blockId,
      )}
    </>
  )
}

function PublicationContextItem({
  route,
  getContext,
}: {
  route: PublicationRoute
  getContext: () => BaseEntityRoute[]
}) {
  const pub = usePublicationVariant({
    documentId: route.documentId,
    versionId: route.versionId,
    variants: route.variants,
  })
  const navigate = useNavigate()
  return (
    <>
      <SidebarItem
        title={getDocumentTitle(pub.data?.publication?.document)}
        icon={FileText}
        onPress={() => {
          navigate({...route, blockId: undefined})
        }}
      />
      {useIntermediateContext(
        route,
        pub.data?.publication?.document,
        route.blockId,
      )}
    </>
  )
}

function GroupContextItem({
  route,
  getContext,
}: {
  route: GroupRoute
  getContext: () => BaseEntityRoute[]
}) {
  const group = useGroup(route.groupId, route.version)
  const groupPub = useGroupFrontPub(route.groupId, route.version)
  const navigate = useNavigate()
  return (
    <>
      <SidebarItem
        title={group.data?.title}
        icon={Book}
        onPress={() => {
          navigate({...route, blockId: undefined})
        }}
      />
      {useIntermediateContext(route, groupPub.data?.document, route.blockId)}
    </>
  )
}

function AccountRouteOutline({route}: {route: AccountRoute}) {
  const activeRoute = useNavRoute()
  const isActive =
    activeRoute.key === 'account' && activeRoute.accountId === route.accountId
  const account = useAccount(route.accountId)
  const profilePub = useProfilePublication(route.accountId)
  const pubEmbeds = usePublicationEmbeds(
    profilePub.data.publication,
    !!profilePub.data,
    {
      skipCards: true,
    },
  )
  const docOutline = getDocOutline(
    profilePub?.data?.publication?.document?.children || [],
    pubEmbeds,
  )
  const navigate = useNavigate()
  const replace = useNavigate('replace')
  const navigateBlock = useNavigateBlock()
  const {outlineContent, isBlockActive} = activeDocOutline(
    docOutline,
    route.blockId,
    pubEmbeds,
    navigateBlock,
    navigate,
  )
  return (
    <>
      {useContextItems(route.context)}
      <SidebarItem
        active={isActive && !isBlockActive}
        onPress={() => {
          if (!isActive) {
            navigate(route)
          } else if (route.blockId) {
            replace({...route, blockId: undefined})
          }
        }}
        title={account.data?.profile?.alias}
        icon={Contact}
      />
      {outlineContent}
    </>
  )
}

function PublicationRouteOutline({route}: {route: PublicationRoute}) {
  const pub = usePublicationVariant({
    documentId: route.documentId,
    versionId: route.versionId,
    variants: route.variants,
  })
  const pubEmbeds = usePublicationEmbeds(pub.data.publication, !!pub.data, {
    skipCards: true,
  })
  const docOutline = getDocOutline(
    pub?.data?.publication?.document?.children || [],
    pubEmbeds,
  )
  const navigate = useNavigate()
  const replace = useNavigate('replace')
  const navigateBlock = useNavigateBlock()
  const {outlineContent, isBlockActive} = activeDocOutline(
    docOutline,
    route.blockId,
    pubEmbeds,
    navigateBlock,
    navigate,
  )
  return (
    <>
      {useContextItems(route.context)}
      <SidebarItem
        active={!isBlockActive}
        onPress={() => {
          if (route.blockId) {
            replace({...route, blockId: undefined})
          }
        }}
        title={pub.data?.publication?.document?.title}
        icon={FileText}
      />
      {outlineContent}
    </>
  )
}

function GroupRouteOutline({route}: {route: GroupRoute}) {
  const group = useGroup(route.groupId, route.version)
  const frontPub = useGroupFrontPub(route.groupId, route.version)
  const navigate = useNavigate()
  const frontPubEmbeds = usePublicationEmbeds(frontPub.data, !!frontPub.data, {
    skipCards: true,
  })
  const frontDocOutline = getDocOutline(
    frontPub?.data?.document?.children || [],
    frontPubEmbeds,
  )
  const navigateBlock = useNavigateBlock()
  const replace = useNavigate('replace')
  const {outlineContent: frontPubOutlineContent, isBlockActive} =
    activeDocOutline(
      frontDocOutline,
      route.blockId,
      frontPubEmbeds,
      navigateBlock,
      navigate,
    )
  return (
    <>
      {useContextItems(route.context)}
      <SidebarItem
        active={!isBlockActive}
        onPress={() => {
          if (route.blockId) {
            replace({...route, blockId: undefined})
          }
        }}
        title={group.data?.title}
        icon={Book}
      />
      {frontPubOutlineContent}
    </>
  )
}
