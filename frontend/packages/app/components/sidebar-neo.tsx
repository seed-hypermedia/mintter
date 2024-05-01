import {
  HMBlockNode,
  HMEntityContent,
  UnpackedHypermediaId,
  getBlockNodeById,
  getDocumentTitle,
  unpackHmId,
} from '@mintter/shared'
import {Tooltip} from '@mintter/ui'
import {
  Book,
  Contact,
  FileText,
  Hash,
  Pencil,
  Star,
} from '@tamagui/lucide-icons'
import {ReactNode, memo, useCallback, useMemo, useState} from 'react'
import {Button, SizableText, Spinner, View} from 'tamagui'
import {useAccount, useMyAccount} from '../models/accounts'
import {
  getEntityRoutes,
  useEntitiesContent,
  useEntityContent,
  useEntityRoutes,
} from '../models/entities'
import {useFavorites} from '../models/favorites'
import {useGroup} from '../models/groups'
import {useDocumentDrafts, usePublicationVariant} from '../models/publication'
import {getRouteKey, useNavRoute} from '../utils/navigation'
import {BaseAccountRoute, BaseEntityRoute, NavRoute} from '../utils/routes'
import {useNavigate} from '../utils/useNavigate'
import {
  FocusButton,
  SidebarDivider,
  SidebarGroupItem,
  SidebarItem,
} from './sidebar-base'

type IconDefinition = React.FC<{size: any; color: any}>

export function SidebarNeo() {
  const route = useNavRoute()
  const [collapseFavorites, setCollapseFavorites] = useState(true)
  const [collapseMe, setCollapseMe] = useState(true)
  const [collapseStandalone, setCollapseStandalone] = useState(false)
  const myAccount = useMyAccount()
  const myAccountRoute = useMemo(() => {
    return myAccount.data?.id
      ? ({key: 'account', accountId: myAccount.data.id} as BaseAccountRoute)
      : null
  }, [myAccount.data])
  const navigate = useNavigate()
  const replace = useNavigate('replace')
  let myAccountSection: ReactNode = null
  let standaloneSection: ReactNode = null
  const entityRoutes = useEntityRoutes(route)
  const firstEntityRoute = entityRoutes[0]
  const isMyAccountActive =
    firstEntityRoute &&
    firstEntityRoute.key === 'account' &&
    firstEntityRoute.accountId === myAccount.data?.id
  const entityContents = useEntitiesContent(
    myAccountRoute ? [myAccountRoute, ...entityRoutes] : entityRoutes,
  )
  const handleNavigate = useCallback(function handleNavigate(
    route: NavRoute,
    doReplace?: boolean,
  ) {
    if (doReplace) replace(route)
    else navigate(route)
    const destEntityRoutes = getEntityRoutes(route)
    const firstEntityRoute = destEntityRoutes[0]
    const isMyAccountActive =
      firstEntityRoute &&
      firstEntityRoute.key === 'account' &&
      firstEntityRoute.accountId === myAccount.data?.id
    setCollapseFavorites(true)
    setCollapseMe(isMyAccountActive ? false : true)
    setCollapseStandalone(isMyAccountActive ? true : false)
  }, [])
  if (isMyAccountActive) {
    // the active route is under myAccount section
    myAccountSection = (
      <RouteSection
        onNavigate={handleNavigate}
        collapse={collapseMe}
        setCollapse={setCollapseMe}
        routes={entityRoutes}
        activeRoute={route}
        entityContents={entityContents}
        active
      />
    )
  } else {
    if (myAccountRoute) {
      myAccountSection = (
        <RouteSection
          onNavigate={handleNavigate}
          collapse={collapseMe}
          setCollapse={setCollapseMe}
          routes={[myAccountRoute]}
          activeRoute={route}
          entityContents={entityContents}
        />
      )
    }
    standaloneSection = (
      <RouteSection
        onNavigate={handleNavigate}
        collapse={collapseStandalone}
        setCollapse={setCollapseStandalone}
        routes={entityRoutes}
        activeRoute={route}
        entityContents={entityContents}
        active
      />
    )
  }
  return (
    <>
      <SidebarFavorites
        collapse={collapseFavorites}
        setCollapse={setCollapseFavorites}
        onNavigate={handleNavigate}
      />
      {myAccountSection ? (
        <>
          <SidebarDivider />
          {myAccountSection}
        </>
      ) : null}
      {standaloneSection ? (
        <>
          <SidebarDivider />
          {standaloneSection}
        </>
      ) : null}
    </>
  )
}

function getBlockHeadings(
  children: HMBlockNode[] | undefined,
  blockId: string | undefined,
) {
  let blockHeadings: null | {id: string; text: string}[] = null
  if (!blockId) return []
  function findBlock(
    nodes: HMBlockNode[] | undefined,
    parentHeadings: {id: string; text: string}[],
  ) {
    return nodes?.find((blockNode) => {
      if (!blockId) return null
      const theseHeadings = [
        ...parentHeadings,
        {id: blockNode.block.id, text: blockNode.block.text},
      ]
      if (blockNode.block.id === blockId) {
        blockHeadings = theseHeadings
        return true
      }
      if (blockNode.children?.length) {
        return findBlock(blockNode.children, theseHeadings)
      }
      return false
    })
  }
  findBlock(children, [])
  return blockHeadings as null | {id: string; text: string}[]
}
function getItemDetails(entity: HMEntityContent | undefined, blockId?: string) {
  let title: string | undefined = undefined
  let icon: IconDefinition | undefined = undefined
  if (!entity) return null
  if (entity.type === 'a') {
    title = entity.account?.profile?.alias
    icon = Contact
  }
  if (entity.type === 'g') {
    title = entity.group?.title
    icon = Book
  }
  if (entity.type === 'd') {
    title = getDocumentTitle(entity.document)
    icon = FileText
  }
  const headings = getBlockHeadings(entity.document?.children, blockId)
  return {
    docId: entity.document?.id,
    title,
    icon,
    headings,
  }
}

function ResumeDraftButton({docId}: {docId?: string}) {
  const navigate = useNavigate()
  const drafts = useDocumentDrafts(docId)
  const draft = drafts.data?.[0]
  if (draft) {
    return (
      <Tooltip content="Resume Editing">
        <Button
          onPress={(e) => {
            e.stopPropagation()
            navigate({key: 'draft', draftId: draft.id, variant: null})
          }}
          size="$2"
          theme="yellow"
          icon={Pencil}
        />
      </Tooltip>
    )
  }
  return null
}

function ContextItems({
  info,
  active,
  isCollapsed,
  onSetCollapsed,
  route,
  onNavigate,
}: {
  info: ReturnType<typeof getItemDetails>
  active?: boolean
  isCollapsed?: boolean
  onSetCollapsed?: (collapse: boolean) => void
  route: BaseEntityRoute
  onNavigate: (route: NavRoute) => void
}) {
  console.log('ContextItems', info)
  if (!info) return null
  return (
    <>
      <SidebarItem
        active={active && !info.headings?.length}
        isCollapsed={isCollapsed}
        onSetCollapsed={onSetCollapsed}
        title={info.title}
        icon={info.icon}
        onPress={() => {
          onNavigate({...route, blockId: undefined, focusBlockId: undefined})
        }}
        iconAfter={<ResumeDraftButton docId={info.docId} />}
      />
      {info.headings?.map((heading, headingIndex) => (
        <SidebarItem
          icon={Hash}
          active={
            active &&
            !!info.headings &&
            headingIndex === info.headings.length - 1
          }
          title={heading.text}
          onPress={() => {
            onNavigate({...route, blockId: heading.id})
          }}
        />
      ))}
    </>
  )
}

function RouteSection({
  routes,
  activeRoute,
  collapse,
  setCollapse,
  onNavigate,
  entityContents,
  active,
}: {
  routes: BaseEntityRoute[]
  activeRoute: NavRoute
  collapse?: boolean
  setCollapse?: (collapse: boolean) => void
  onNavigate: (route: NavRoute, doReplace?: boolean) => void
  entityContents?: {route: BaseEntityRoute; entity?: HMEntityContent}[]
  active?: boolean
}) {
  const thisRoute = routes.at(-1)
  const prevRoutes = routes.slice(0, -1)
  const thisRouteEntity = entityContents?.find((c) => c.route === thisRoute)
  console.log('thisEntity', thisRouteEntity)
  const thisRouteInfo = getItemDetails(
    thisRouteEntity?.entity,
    thisRoute?.focusBlockId,
  )
  const focusedNodes =
    thisRoute?.focusBlockId && thisRouteEntity?.entity?.document?.children
      ? getBlockNodeById(
          thisRouteEntity?.entity?.document?.children,
          thisRoute?.focusBlockId,
        )?.children
      : thisRouteEntity?.entity?.document?.children
  const onActivateBlock = useCallback(
    (blockId) => {
      if (!thisRoute) return
      const thisRouteKey = getRouteKey(thisRoute)
      const activeRouteKey = getRouteKey(activeRoute)
      const shouldReplace = thisRouteKey === activeRouteKey
      onNavigate({...thisRoute, blockId}, shouldReplace)
    },
    [thisRoute, activeRoute],
  )
  const onFocusBlock = useCallback(
    (blockId) => {
      if (!thisRoute) return
      onNavigate({...thisRoute, focusBlockId: blockId})
    },
    [onNavigate, thisRoute],
  )
  return (
    <>
      {prevRoutes.map((contextRoute) => {
        const info = getItemDetails(
          entityContents?.find((c) => c.route === contextRoute)?.entity,
          contextRoute.blockId,
        )
        return (
          <ContextItems
            info={info}
            route={contextRoute}
            onNavigate={onNavigate}
          />
        )
      })}
      {thisRoute && (
        <ContextItems
          info={thisRouteInfo}
          route={thisRoute}
          onNavigate={onNavigate}
          active={active}
          isCollapsed={collapse}
          onSetCollapsed={setCollapse}
        />
      )}
      {collapse || !thisRoute ? null : (
        <SidebarOutline
          indent={1}
          activeBlock={thisRouteEntity?.route?.blockId}
          nodes={focusedNodes}
          onActivateBlock={onActivateBlock}
          onFocusBlock={onFocusBlock}
        />
      )}
    </>
  )
}

function SidebarEmbedOutlineItem({
  indent,
  id,
  blockId,
  activeBlock,
  onActivateBlock,
  onFocusBlock,
}: {
  indent: number
  id: UnpackedHypermediaId
  blockId: string
  activeBlock?: string
  onActivateBlock: (blockId: string) => void
  onFocusBlock: (blockId: string) => void
}) {
  const [collapse, setCollapse] = useState(true)
  const loadedEntity = useEntityContent(id)
  if (loadedEntity === undefined)
    return <SidebarItem indented={indent} icon={() => <Spinner />} />
  const doc = loadedEntity?.document
  const singleBlockNode =
    id.blockRef && doc?.children
      ? getBlockNodeById(doc.children, id.blockRef)
      : null
  if (singleBlockNode) return null
  const info = loadedEntity ? getItemDetails(loadedEntity) : null
  if (doc && info)
    return (
      <>
        <SidebarItem
          indented={indent + 1}
          title={info?.title || 'Untitled Embed'}
          icon={info?.icon}
          isCollapsed={collapse}
          onSetCollapsed={setCollapse}
          active={activeBlock === blockId}
          activeBgColor={'$yellow4'}
          onPress={() => {
            onActivateBlock(blockId)
          }}
        />
        {collapse ? null : (
          <SidebarOutline
            activeBlock={activeBlock}
            onActivateBlock={onActivateBlock}
            onFocusBlock={onFocusBlock}
            nodes={singleBlockNode ? [singleBlockNode] : doc.children}
            indent={indent + 1}
          />
        )}
      </>
    )
  return (
    <SizableText margin="$2" size="$1" theme="red">
      Failed to Load Embed
    </SizableText>
  )
}

function _SidebarOutline({
  activeBlock,
  nodes,
  onActivateBlock,
  onFocusBlock,
  indent = 0,
}: {
  activeBlock?: string
  nodes?: HMBlockNode[]
  onActivateBlock: (blockId: string) => void
  onFocusBlock: (blockId: string) => void
  indent?: number
}) {
  const outline = getNodesOutline(nodes || [])

  function getOutline(outline: NodesOutline, level = 0): ReactNode[] {
    const outlineContent = outline.map((item) => {
      const childrenOutline = item.children
        ? getOutline(item.children, level + 1)
        : null
      if (item.embedId)
        return (
          <SidebarEmbedOutlineItem
            activeBlock={activeBlock}
            id={item.embedId}
            blockId={item.id}
            indent={1 + level}
            key={item.id}
            onActivateBlock={onActivateBlock}
            onFocusBlock={onFocusBlock}
          />
        )
      return (
        <SidebarGroupItem
          onPress={() => {
            onActivateBlock(item.id)
          }}
          active={item.id === activeBlock}
          activeBgColor={item.id === activeBlock ? '$yellow4' : undefined}
          icon={
            <View width={16}>
              {item.icon ? (
                <item.icon color="$color9" size={16} />
              ) : (
                <Hash color="$color9" size={16} />
              )}
            </View>
          }
          title={item.title || 'Untitled Heading'}
          indented={1 + level}
          items={childrenOutline || []}
          rightHover={[
            <FocusButton
              onPress={() => {
                onFocusBlock(item.id)
              }}
            />,
          ]}
          defaultExpanded
        />
      )
    })
    return outlineContent
  }

  return getOutline(outline, indent)
}
const SidebarOutline = memo(_SidebarOutline)

type NodeOutline = {
  title?: string
  id: string
  entityId?: UnpackedHypermediaId
  embedId?: UnpackedHypermediaId
  parentBlockId?: string
  children?: NodeOutline[]
  icon?: IconDefinition
}
type NodesOutline = NodeOutline[]

export function getNodesOutline(
  children: HMBlockNode[],
  parentEntityId?: UnpackedHypermediaId,
  parentBlockId?: string,
): NodesOutline {
  const outline: NodesOutline = []
  children.forEach((child) => {
    if (child.block.type === 'heading') {
      outline.push({
        id: child.block.id,
        title: child.block.text,
        entityId: parentEntityId,
        parentBlockId,
        children:
          child.children &&
          getNodesOutline(child.children, parentEntityId, parentBlockId),
      })
    } else if (
      child.block.type === 'embed' &&
      child.block.attributes?.view !== 'card'
    ) {
      const embedId = unpackHmId(child.block.ref)
      if (embedId) {
        outline.push({
          id: child.block.id,
          embedId,
        })
      }
    } else if (child.children) {
      outline.push(
        ...getNodesOutline(child.children, parentEntityId, parentBlockId),
      )
    }
  })
  return outline
}

function SidebarFavorites({
  collapse,
  setCollapse,
  onNavigate,
}: {
  collapse: boolean
  setCollapse: (collapse: boolean) => void
  onNavigate: (route: NavRoute) => void
}) {
  const navigate = useNavigate()
  const favorites = useFavorites()
  const route = useNavRoute()
  let items: ReactNode[] = []
  if (!collapse) {
    items = favorites.map((fav) => {
      const {key, url} = fav
      if (key === 'account') {
        return (
          <FavoriteAccountItem key={url} url={url} onNavigate={onNavigate} />
        )
      }
      if (key === 'document') {
        return (
          <FavoritePublicationItem
            key={url}
            url={url}
            onNavigate={onNavigate}
          />
        )
      }
      if (key === 'group') {
        return <FavoriteGroupItem key={url} url={url} onNavigate={onNavigate} />
      }
      return null
    })
  }
  return (
    <>
      <SidebarItem
        active={route.key == 'favorites'}
        onPress={() => {
          navigate({key: 'favorites'})
        }}
        title="Favorites"
        bold
        isCollapsed={collapse}
        onSetCollapsed={setCollapse}
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
      />
      {items}
    </>
  )
}

function FavoriteAccountItem({
  url,
  onNavigate,
}: {
  url: string
  onNavigate: (route: NavRoute) => void
}) {
  const id = unpackHmId(url)
  const route = useNavRoute()
  const accountId = id?.eid
  const account = useAccount(accountId)
  if (!accountId) return null
  return (
    <SidebarItem
      active={route.key === 'account' && route.accountId === accountId}
      indented
      onPress={() => {
        onNavigate({key: 'account', accountId})
      }}
      title={account.data?.profile?.alias || 'Unknown Account'}
    />
  )
}

function FavoriteGroupItem({
  url,
  onNavigate,
}: {
  url: string
  onNavigate: (route: NavRoute) => void
}) {
  const id = unpackHmId(url)
  const route = useNavRoute()
  const groupId = id?.qid
  const group = useGroup(groupId)
  if (!groupId) return null
  return (
    <SidebarItem
      indented
      active={route.key === 'group' && route.groupId === groupId}
      onPress={() => {
        onNavigate({key: 'group', groupId})
      }}
      title={group.data?.title || 'Unknown Group'}
    />
  )
}

function FavoritePublicationItem({
  url,
  onNavigate,
}: {
  url: string
  onNavigate: (route: NavRoute) => void
}) {
  const id = unpackHmId(url)
  const route = useNavRoute()
  const pub = usePublicationVariant({
    documentId: id?.qid,
    versionId: id?.version || undefined,
    variants: id?.variants || undefined,
  })
  const documentId = id?.qid
  if (!documentId) return null
  return (
    <SidebarItem
      indented
      active={route.key === 'publication' && route.documentId === documentId}
      onPress={() => {
        onNavigate({
          key: 'publication',
          documentId,
          versionId: id?.version || undefined,
          variants: id?.variants || undefined,
        })
      }}
      title={getDocumentTitle(pub.data?.publication?.document)}
    />
  )
}
