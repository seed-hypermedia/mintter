import {useAccount} from '@shm/desktop/src/models/accounts'
import {useDocumentEmbeds} from '@shm/desktop/src/models/documents'
import {useFavorites} from '@shm/desktop/src/models/favorites'
import {
  appRouteOfId,
  getRouteKey,
  useNavRoute,
} from '@shm/desktop/src/utils/navigation'
import {
  getRouteContext,
  getRouteParentContext,
} from '@shm/desktop/src/utils/route-context'
import {
  AccountRoute,
  BaseEntityRoute,
  DocumentRoute,
  NavRoute,
} from '@shm/desktop/src/utils/routes'
import {useNavigate} from '@shm/desktop/src/utils/useNavigate'
import {
  HMBlockNode,
  HMDocument,
  UnpackedHypermediaId,
  getDocumentTitle,
  unpackHmId,
} from '@shm/shared'
import {Button, Home, SizableText, XStack, YStack} from '@shm/ui'
import {Contact, FileText, Hash, Sparkles, Star} from '@tamagui/lucide-icons'
import {PropsWithChildren, ReactNode, memo, useMemo} from 'react'
import {
  GenericSidebarContainer,
  SidebarDivider,
  SidebarGroupItem,
  SidebarItem,
  activeDocOutline,
  getDocOutline,
} from './sidebar-base'
import {SidebarNeo} from './sidebar-neo'

export const AppSidebar = memo(MainAppSidebar)

export function MainAppSidebar() {
  const route = useNavRoute()
  const navigate = useNavigate()

  return (
    <GenericSidebarContainer>
      <SidebarItem
        active={route.key == 'home'}
        onPress={() => {
          navigate({key: 'home'})
        }}
        title="Home"
        bold
        icon={Home}
      />
      <SidebarItem
        active={route.key == 'feed'}
        onPress={() => {
          navigate({key: 'feed'})
        }}
        title="Feed"
        bold
        icon={Home}
      />
      <SidebarItem
        active={route.key == 'explore'}
        onPress={() => {
          navigate({key: 'explore'})
        }}
        title="Explore Content"
        bold
        icon={Sparkles}
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
      <SidebarNeo />
      {/* <SidebarFavorites key={getRouteKey(route)} />
      <SidebarDivider /> */}
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
      {/* {myAccount.data?.id && (
        <AccountRouteOutline
          route={
            myAccountRoute || {key: 'account', accountId: myAccount.data?.id}
          }
        />
      )}

      {myAccountRoute ? null : (
        <RouteOutline route={route} myAccountId={myAccount.data?.id} />
      )} */}
    </GenericSidebarContainer>
  )
}

function SidebarFavorites() {
  const navigate = useNavigate()
  const favorites = useFavorites()
  const route = useNavRoute()
  return (
    <SidebarGroupItem
      active={route.key == 'favorites'}
      onPress={() => {
        navigate({key: 'favorites'})
      }}
      title="Favorites"
      bold
      icon={Star}
      rightHover={
        [
          // <OptionsDropdown
          //   menuItems={[
          //     {
          //       key: 'a',
          //       icon: Pencil,
          //       label: 'Edit Favorites',
          //       onPress: () => {},
          //     },
          //   ]}
          // />,
        ]
      }
      items={favorites.map((fav) => {
        const {key, url} = fav
        if (key === 'account') {
          return <FavoriteAccountItem key={url} url={url} />
        }
        if (key === 'document') {
          return <FavoritePublicationItem key={url} url={url} />
        }
        return null
      })}
    />
  )
}

function FavoriteAccountItem({url}: {url: string}) {
  const id = unpackHmId(url)
  const route = useNavRoute()
  const accountId = id?.eid
  const account = useAccount(accountId)
  const navigate = useNavigate()
  if (!accountId) return null
  return (
    <SidebarItem
      active={route.key === 'account' && route.accountId === accountId}
      indented
      onPress={() => {
        navigate({key: 'account', accountId})
      }}
      title={account.data?.profile?.alias || 'Unknown Account'}
    />
  )
}

function FavoritePublicationItem({url}: {url: string}) {
  const id = unpackHmId(url)
  const route = useNavRoute()
  const navigate = useNavigate()
  const pub = usePublicationVariant({
    documentId: id?.qid,
    versionId: id?.version || undefined,
  })
  const documentId = id?.qid
  if (!documentId) return null
  return (
    <SidebarItem
      indented
      active={route.key === 'document' && route.documentId === documentId}
      onPress={() => {
        navigate({
          key: 'document',
          documentId,
          versionId: id?.version || undefined,
        })
      }}
      title={getDocumentTitle(pub.data?.publication?.document)}
    />
  )
}

function RouteOutline({
  route,
  myAccountId,
}: {
  route: NavRoute
  myAccountId: string | undefined
}) {
  if (route.key === 'draft') {
    if (route.contextRoute?.key === 'document') {
      return (
        <>
          <SidebarDivider />
          <DocumentRouteOutline route={route.contextRoute} />
        </>
      )
    }
    if (route.contextRoute?.key === 'account') {
      return (
        <>
          <SidebarDivider />
          <AccountRouteOutline route={route.contextRoute} />
        </>
      )
    }
  }
  if (route.key === 'account') {
    if (route.accountId === myAccountId) return null
    return (
      <>
        <SidebarDivider />
        <AccountRouteOutline route={route} />
      </>
    )
  }
  if (route.key === 'document') {
    return (
      <>
        <SidebarDivider />
        <DocumentRouteOutline route={route} />
      </>
    )
  }
  return null
}

function useNavigateBlock(fromRoute: NavRoute) {
  const replace = useNavigate('replace')
  const thisRoute = useNavRoute()
  const navigate = useNavigate()
  function navigateBlock(
    blockId: string,
    entityId?: UnpackedHypermediaId,
    parentBlockId?: string,
  ) {
    if (entityId || getRouteKey(fromRoute) !== getRouteKey(thisRoute)) {
      const destRoute = entityId ? appRouteOfId(entityId) : fromRoute
      // uh, I'm sure this code is buggy:
      const context = entityId ? getRouteContext(fromRoute, parentBlockId) : []
      if (destRoute?.key === 'document') {
        navigate({
          ...destRoute,
          context,
          blockId,
        })
      } else if (destRoute?.key === 'account') {
        navigate({
          ...destRoute,
          tab: 'profile',
          context,
          blockId,
        })
      } else if (destRoute) {
        navigate(destRoute)
      }
    } else if (fromRoute.key === 'document') {
      replace({
        ...fromRoute,
        blockId,
      })
    } else if (fromRoute.key === 'account') {
      replace({
        ...fromRoute,
        tab: 'profile',
        blockId,
      })
    }
  }
  function focusBlock(
    blockId: string,
    entityId?: UnpackedHypermediaId,
    parentBlockId?: string,
  ) {
    const context = getRouteParentContext(fromRoute)
    const destRoute = entityId ? appRouteOfId(entityId) : fromRoute
    if (destRoute?.key === 'document') {
      navigate({
        ...destRoute,
        context,
        blockId: blockId,
        isBlockFocused: true,
      })
    } else if (destRoute?.key === 'account') {
      navigate({
        ...destRoute,
        context,
        blockId: blockId,
        isBlockFocused: true,
      })
    } else if (destRoute) {
      navigate(destRoute)
    }
  }
  return {navigateBlock, focusBlock}
}

function useContextItems(context: BaseEntityRoute[] | undefined) {
  const items =
    context?.map((contextRoute, index) => {
      if (contextRoute.key === 'account')
        return (
          <AccountContextItem
            route={contextRoute}
            getContext={() => context.slice(0, index)}
          />
        )
      if (contextRoute.key === 'document')
        return (
          <PublicationContextItem
            route={contextRoute}
            getContext={() => context.slice(0, index)}
          />
        )
      return null
    }) || null
  return {items}
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
  const pub = useProfileDocument(route.accountId)
  const navigate = useNavigate()
  return (
    <>
      <SidebarItem
        title={account.data?.profile?.alias || 'Unknown Account'}
        icon={Contact}
        onPress={() => {
          navigate({...route, blockId: undefined, isBlockFocused: undefined})
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
  route: DocumentRoute
  getContext: () => BaseEntityRoute[]
}) {
  const pub = usePublicationVariant({
    documentId: route.documentId,
    versionId: route.versionId,
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

function isDraftActive(route: NavRoute, documentId: string | undefined) {
  return route.key === 'draft' && route.draftId === documentId
}

function AccountRouteOutline({route}: {route: AccountRoute}) {
  const activeRoute = useNavRoute()
  const isActive =
    activeRoute.key === 'account' && activeRoute.accountId === route.accountId
  const account = useAccount(route.accountId)
  const profilePub = useProfilePublicationWithDraft(route.accountId)
  const pubEmbeds = useDocumentEmbeds(
    profilePub.data?.document,
    !!profilePub.data,
    {
      skipCards: true,
    },
  )
  const docOutline = getDocOutline(
    profilePub?.data?.document?.children || [],
    pubEmbeds,
  )
  const navigate = useNavigate()
  const replace = useNavigate('replace')
  const {navigateBlock, focusBlock} = useNavigateBlock(route)
  const {outlineContent, isBlockActive, isBlockFocused} = activeDocOutline(
    docOutline,
    route.isBlockFocused ? undefined : route.blockId,
    route.isBlockFocused ? route.blockId : undefined,
    pubEmbeds,
    navigateBlock,
    focusBlock,
    navigate,
  )
  const {items: parentContext} = useContextItems(route.context)
  const isRootActive = isActive && !isBlockFocused
  return (
    <>
      {parentContext}
      <DraftItems
        titleItem={
          <SidebarGroupItem
            active={isRootActive}
            onPress={() => {
              if (!isRootActive) {
                replace({
                  ...route,
                  blockId: undefined,
                  isBlockFocused: undefined,
                })
              }
            }}
            title={account.data?.profile?.alias}
            icon={Contact}
            items={outlineContent}
            defaultExpanded
          />
        }
        isDraft={profilePub.data?.isDocumentDraft}
        onPressDraft={
          isDraftActive(activeRoute, profilePub?.data?.document?.id)
            ? null
            : () => {
                navigate({
                  key: 'draft',
                  draftId: profilePub.data?.drafts?.[0]?.id,
                  contextRoute: route,
                })
              }
        }
      ></DraftItems>
    </>
  )
}

function DocumentRouteOutline({route}: {route: DocumentRoute}) {
  const activeRoute = useNavRoute()
  const pub = usePublicationVariantWithDraft({
    documentId: route.documentId,
    versionId: route.versionId,
  })
  const pubEmbeds = useDocumentEmbeds(pub.data?.document, !!pub.data, {
    skipCards: true,
  })
  const outline = getDocOutline(pub?.data?.document?.children || [], pubEmbeds)
  const navigate = useNavigate()
  const replace = useNavigate('replace')
  const {navigateBlock, focusBlock} = useNavigateBlock(route)
  const {outlineContent, isBlockActive} = activeDocOutline(
    outline,
    route.isBlockFocused ? undefined : route.blockId,
    route.isBlockFocused ? route.blockId : undefined,
    pubEmbeds,
    navigateBlock,
    focusBlock,
    navigate,
  )
  const {items: parentContext} = useContextItems(route.context)
  return (
    <>
      {parentContext}
      <DraftItems
        titleItem={
          <SidebarGroupItem
            active={!isBlockActive}
            onPress={() => {
              if (route.blockId) {
                replace({...route, blockId: undefined})
              }
            }}
            title={pub.data?.document?.title}
            icon={FileText}
            items={outlineContent}
            defaultExpanded
          />
        }
        isDraft={pub.data?.isDocumentDraft}
        onPressDraft={() => {
          isDraftActive(activeRoute, pub?.data?.document?.id)
            ? null
            : navigate({
                key: 'draft',
                draftId: pub.data?.drafts?.[0]?.id,
                contextRoute: route,
                variant: null,
              })
        }}
      ></DraftItems>
    </>
  )
}

function DraftItems({
  titleItem,
  children,
  onPressDraft,
  isDraft,
}: PropsWithChildren<{
  titleItem: ReactNode
  onPressDraft: null | (() => void)
  isDraft?: boolean
}>) {
  return (
    <YStack
      backgroundColor={isDraft ? '$yellow2' : '$colorTransparent'}
      theme={isDraft ? 'yellow' : undefined}
    >
      {titleItem}
      {isDraft ? (
        <XStack
          padding="$2"
          paddingHorizontal="$4"
          backgroundColor="$color5"
          alignItems="center"
          jc="space-between"
        >
          <SizableText color="$color10" fontSize="$2">
            Unsaved Document
          </SizableText>
          {onPressDraft ? (
            <Button onPress={onPressDraft} size="$2">
              Open Draft
            </Button>
          ) : null}
        </XStack>
      ) : null}
      {children}
    </YStack>
  )
}
