import {
  Account,
  API_FILE_URL,
  getBlockNode,
  getDocumentTitle,
  GroupVariant,
  HMBlockNode,
  PublicationVariant,
} from '@mintter/shared'
import {
  Button,
  ListItem,
  ListItemProps,
  Separator,
  SizableText,
  Spinner,
  Tooltip,
  UIAvatar,
  useStream,
  View,
  XStack,
  YGroup,
  YStack,
} from '@mintter/ui'
import {
  ArrowDownRight,
  ArrowUpRight,
  Book,
  FileText,
  Hash,
  Plus,
  Search,
  Settings,
} from '@tamagui/lucide-icons'
import {ReactNode, useEffect, useState} from 'react'
import {useAppContext} from '../app-context'
import appError from '../errors'
import {useAccount, useAccounts} from '../models/accounts'
import {
  EmbedsContent,
  usePublication,
  usePublicationEmbeds,
} from '../models/documents'
import {useGroup} from '../models/groups'
import {usePublicationVariant} from '../models/publication'
import {getAccountName} from '../pages/account-page'
import {SidebarWidth, useSidebarContext} from '../src/sidebar-context'
import {getAvatarUrl} from '../utils/account-url'
import {useNavRoute} from '../utils/navigation'
import {useOpenDraft} from '../utils/open-draft'
import {NavRoute} from '../utils/routes'
import {useNavigate} from '../utils/useNavigate'
import {useTriggerWindowEvent} from '../utils/window-events'
import {Avatar} from './avatar'
import {MenuItemType, OptionsDropdown} from './options-dropdown'

const HoverRegionWidth = 30

export type GroupFocusSidebar = {
  type: 'group'
  key: string
  groupId: string
}

export type AccountFocusSidebar = {
  type: 'account'
  key: string
  accountId: string
}

export type DocumentFocusSidebar = {
  type: 'document'
  key: string
  documentId: string
  version?: string
  variants?: PublicationVariant[]
}

type FocusSidebar =
  | GroupFocusSidebar
  | AccountFocusSidebar
  | DocumentFocusSidebar

export function getRouteSidebars(
  route: NavRoute,
  myAccount: Account | null | undefined,
): FocusSidebar[] | null {
  if (route.key === 'group') {
    return [{type: 'group', key: route.groupId, groupId: route.groupId}]
  }
  if (route.key === 'group-feed') {
    return [{type: 'group', key: route.groupId, groupId: route.groupId}]
  }
  if (route.key === 'account') {
    if (route.accountId === myAccount?.id) return null
    return [{type: 'account', key: route.accountId, accountId: route.accountId}]
  }
  if (route.key === 'account-feed') {
    if (route.accountId === myAccount?.id) return null
    return [{type: 'account', key: route.accountId, accountId: route.accountId}]
  }
  if (route.key === 'account-content') {
    if (route.accountId === myAccount?.id) return null
    return [{type: 'account', key: route.accountId, accountId: route.accountId}]
  }
  if (route.key === 'publication') {
    return [
      {
        type: 'document',
        key: route.documentId,
        documentId: route.documentId,
        version: route.versionId,
        variants: route.variants,
      },
    ]
  }
  return null
}

export function GroupContextButton({
  focus,
  onPress,
}: {
  focus: GroupFocusSidebar
  onPress: () => void
}) {
  const group = useGroup(focus.groupId)
  return (
    <SidebarItem
      minHeight={30}
      paddingVertical="$2"
      color="$color10"
      title={group.data?.title || 'Untitled Group'}
      onPress={onPress}
      active={true}
      icon={Book}
      iconAfter={ArrowDownRight}
    />
  )
}

export function AccountContextButton({
  focus,
  onPress,
}: {
  focus: AccountFocusSidebar
  onPress: () => void
}) {
  const account = useAccount(focus.accountId)
  return (
    <SidebarItem
      minHeight={30}
      paddingVertical="$2"
      color="$color10"
      title={account.data?.profile?.alias || 'Untitled Account'}
      onPress={onPress}
      active={true}
      icon={Book}
      iconAfter={ArrowDownRight}
    />
  )
}

export function DocumentContextButton({
  focus,
  onPress,
}: {
  focus: DocumentFocusSidebar
  onPress: () => void
}) {
  const doc = usePublicationVariant({
    documentId: focus.documentId,
    versionId: focus.version,
    variants: focus.variants,
  })
  return (
    <SidebarItem
      minHeight={30}
      paddingVertical="$2"
      color="$color10"
      title={getDocumentTitle(doc.data?.publication?.document)}
      onPress={onPress}
      active={true}
      icon={FileText}
      iconAfter={ArrowDownRight}
    />
  )
}

// export function getRouteGroupId(route: NavRoute): string | null {
//   let activeGroupRouteId: string | null = null
//   if (route.key === 'group') {
//     activeGroupRouteId = route.groupId
//   } else if (route.key === 'group-feed') {
//     activeGroupRouteId = route.groupId
//   } else if (route.key === 'publication') {
//     if (route.variants) {
//       const groupVariants = route.variants.filter(
//         (variant) => variant.key === 'group',
//       ) as GroupVariant[] | undefined
//       if (groupVariants?.length === 1) {
//         activeGroupRouteId = groupVariants[0]?.groupId || null
//       }
//     }
//   } else if (
//     route.key === 'draft' &&
//     route.variant?.key === 'group' &&
//     route.variant.groupId
//   ) {
//     return route.variant.groupId
//   }
//   return activeGroupRouteId
// }

// export function getRouteAccountId(
//   route: NavRoute,
//   myAccount: Account | null | undefined,
// ): string | null {
//   let activeAccountId: string | null = null
//   if (route.key === 'account') {
//     if (route.accountId === myAccount?.id) return null
//     activeAccountId = route.accountId
//   } else if (route.key === 'account-feed') {
//     if (route.accountId === myAccount?.id) return null
//     activeAccountId = route.accountId
//   } else if (route.key === 'account-content') {
//     if (route.accountId === myAccount?.id) return null
//     activeAccountId = route.accountId
//   } else if (route.key === 'draft' && route.isProfileDocument) {
//     return null
//   }
//   return activeAccountId
// }

export function GenericSidebarContainer({children}: {children: ReactNode}) {
  const ctx = useSidebarContext()
  const isFocused = useIsWindowFocused({
    onBlur: () => ctx.onMenuHoverLeave(),
  })
  const isWindowTooNarrowForHoverSidebar = useIsWindowNarrowForHoverSidebar()
  const isLocked = useStream(ctx.isLocked)
  const isHoverVisible = useStream(ctx.isHoverVisible)
  const isVisible = isLocked || isHoverVisible
  const {platform} = useAppContext()
  let top = platform === 'darwin' ? 40 : 72
  let bottom = 24
  if (!isLocked) {
    top += 8
    bottom += 8
  }
  const triggerFocusedWindow = useTriggerWindowEvent()
  const navigate = useNavigate()
  return (
    <>
      {isFocused && !isLocked && !isWindowTooNarrowForHoverSidebar ? (
        <YStack
          position="absolute"
          left={-20} // this -20 is to make sure the rounded radius is not visible on the edge
          borderRadius={'$3'}
          backgroundColor={'$color11'}
          width={HoverRegionWidth + 20} // this 20 is to make sure the rounded radius is not visible on the edge
          top={top}
          zi={99999}
          opacity={0}
          hoverStyle={{
            opacity: 0.1,
          }}
          bottom={bottom}
          cursor="pointer"
          onMouseEnter={ctx.onMenuHoverDelayed}
          onMouseLeave={ctx.onMenuHoverLeave}
          onPress={ctx.onMenuHover}
        />
      ) : null}
      <YStack
        backgroundColor={'$color1'}
        borderRightWidth={1}
        borderColor={'$color4'}
        animation="fast"
        position="absolute"
        zi={99999}
        x={isVisible ? 0 : -SidebarWidth}
        width="100%"
        maxWidth={SidebarWidth}
        elevation={!isLocked ? '$4' : undefined}
        top={top}
        bottom={bottom}
        borderTopRightRadius={!isLocked ? '$3' : undefined}
        borderBottomRightRadius={!isLocked ? '$3' : undefined}
        onMouseEnter={ctx.onMenuHover}
        onMouseLeave={ctx.onMenuHoverLeave}
        opacity={isVisible ? 1 : 0}
      >
        <YStack
          flex={1}
          // @ts-expect-error
          overflow="auto" // why does Tamagui/TS not agree that this is an acceptable value? IT WORKS!
        >
          {children}
        </YStack>
        <YGroup
          separator={<Separator />}
          borderRadius={0}
          borderTopWidth={1}
          borderColor="$borderColor"
        >
          <YGroup.Item>
            <SidebarItem
              onPress={() => {
                triggerFocusedWindow('openLauncher')
              }}
              title="Search / Open"
              icon={Search}
            />
          </YGroup.Item>
          <YGroup.Item>
            <SidebarItem
              onPress={() => {
                navigate({key: 'settings'})
              }}
              cursor="pointer"
              icon={Settings}
              title="Settings"
            />
          </YGroup.Item>
        </YGroup>
      </YStack>
    </>
  )
}

export function NewDocumentButton({
  groupVariant,
  label,
}: {
  groupVariant?: GroupVariant | undefined
  label?: string
}) {
  const openDraft = useOpenDraft('push')
  return (
    <Tooltip content={`New ${label || 'Document'}`}>
      <Button
        size="$2"
        chromeless
        backgroundColor="$colorTransparent"
        iconAfter={Plus}
        onPress={(e) => {
          e.stopPropagation()
          openDraft(groupVariant)
        }}
      />
    </Tooltip>
  )
}

export const useIsWindowFocused = ({
  onFocus,
  onBlur,
}: {
  onFocus?: () => void
  onBlur?: () => void
}): boolean => {
  const [isFocused, setIsFocused] = useState(document.hasFocus())
  useEffect(() => {
    const handleFocus = () => {
      onFocus?.()
      setIsFocused(true)
    }
    const handleBlur = () => {
      onBlur?.()
      setIsFocused(false)
    }
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])
  return isFocused
}

function useIsWindowNarrowForHoverSidebar() {
  const [
    isWindowTooNarrowForHoverSidebar,
    setIsWindowTooNarrowForHoverSidebar,
  ] = useState(window.innerWidth < 820)
  useEffect(() => {
    const handleResize = () => {
      setIsWindowTooNarrowForHoverSidebar(window.innerWidth < 820)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  return isWindowTooNarrowForHoverSidebar
}

export function SidebarItem({
  disabled,
  title,
  icon,
  iconAfter,
  children,
  indented,
  bold,
  active,
  rightHover,
  color,
  paddingVertical,
  minHeight,
  menuItems,
  ...props
}: ListItemProps & {
  indented?: boolean | number
  bold?: boolean
  selected?: boolean
  rightHover?: ReactNode[]
  menuItems?: MenuItemType[]
}) {
  const indent = indented ? (typeof indented === 'number' ? indented : 1) : 0
  return (
    <View group="item">
      <ListItem
        hoverTheme
        pressTheme
        focusTheme
        minHeight={minHeight}
        paddingVertical={paddingVertical || '$2'}
        paddingHorizontal="$4"
        paddingLeft={indent * 10 + 18}
        textAlign="left"
        outlineColor="transparent"
        // space="$2"
        backgroundColor={active ? '$blue4' : '$backgroundStrong'}
        hoverStyle={active ? {backgroundColor: '$blue4'} : {}}
        userSelect="none"
        group="item"
        color={color || '$gray12'}
        cursor={active ? undefined : 'pointer'}
        title={
          title ? (
            <SizableText
              fontSize="$3"
              color={color || '$gray12'}
              cursor={active ? undefined : 'pointer'}
              fontWeight={bold ? 'bold' : undefined}
              userSelect="none"
            >
              {title}
            </SizableText>
          ) : undefined
        }
        icon={icon}
        iconAfter={
          iconAfter || (
            <>
              <XStack opacity={0} $group-item-hover={{opacity: 1}}>
                {rightHover}
              </XStack>
              {menuItems ? (
                <OptionsDropdown hiddenUntilItemHover menuItems={menuItems} />
              ) : null}
            </>
          )
        }
        {...props}
      >
        {children}
      </ListItem>
    </View>
  )
}

export function MyAccountItem({
  account,
  onRoute,
  active,
}: {
  account?: Account
  onRoute: (route: NavRoute) => void
  active: boolean
}) {
  return (
    <ListItem
      hoverTheme
      pressTheme
      focusTheme
      paddingVertical="$2"
      minHeight={70}
      paddingHorizontal="$4"
      textAlign="left"
      outlineColor="transparent"
      space="$2"
      userSelect="none"
      backgroundColor={active ? '$blue4' : undefined}
      hoverStyle={active ? {backgroundColor: '$blue4'} : {}}
      cursor={active ? undefined : 'pointer'}
      title={
        <YStack>
          <SizableText
            fontSize="$2"
            fontWeight={'bold'}
            cursor={active ? 'not-allowed' : 'pointer'}
            userSelect="none"
          >
            {getAccountName(account?.profile)}
          </SizableText>
          <SizableText size="$1" color="$9">
            My Account
          </SizableText>
        </YStack>
      }
      onPress={() => {
        if (!account?.id) {
          appError('Account has not loaded.')
          return
        }
        onRoute({key: 'account', accountId: account?.id})
      }}
      icon={
        <Avatar
          size={36}
          label={account?.profile?.alias}
          id={account?.id}
          url={getAvatarUrl(account?.profile?.avatar)}
        />
      }
    ></ListItem>
  )
}

type DocOutlineSection = {
  title: string
  id: string
  linkRoute?: NavRoute
  children?: DocOutlineSection[]
}
type DocOutline = DocOutlineSection[]

export function getDocOutline(
  children: HMBlockNode[],
  embeds: EmbedsContent,
): DocOutline {
  const outline: DocOutline = []
  children.forEach((child) => {
    if (child.block.type === 'heading') {
      outline.push({
        title: child.block.text,
        id: child.block.id,
        children: child.children && getDocOutline(child.children, embeds),
      })
      // } else if ( // disable card links for now
      //   child.block.type === 'embed' &&
      //   child.block.attributes?.view === 'card' &&
      //   embeds[child.block.id]
      // ) {
      //   const embed = embeds[child.block.id]
      //   if (embed?.type === 'd') {
      //     outline.push({
      //       id: child.block.id,
      //       title: embed?.data?.document?.title || 'Untitled Document',
      //       linkRoute: {
      //         key: 'publication',
      //         documentId: embed?.query?.refId?.qid,
      //         versionId: embed?.query?.refId?.version || undefined,
      //         variants: embed?.query?.refId?.variants || undefined,
      //       },
      //       children: child.children && getDocOutline(child.children, embeds),
      //     })
      //   } else if (embed?.type === 'a') {
      //     outline.push({
      //       id: child.block.id,
      //       title: embed?.data?.profile?.alias || 'Untitled Account',
      //       linkRoute: {
      //         key: 'account',
      //         accountId: embed?.query?.refId?.eid,
      //       },
      //       children: child.children && getDocOutline(child.children, embeds),
      //     })
      //   } else if (embed?.type === 'g') {
      //     outline.push({
      //       id: child.block.id,
      //       title: embed?.data?.title || 'Untitled Group',
      //       linkRoute: {
      //         key: 'group',
      //         groupId: embed?.query?.refId?.qid,
      //         version: embed?.query?.refId?.version || undefined,
      //       },
      //       children: child.children && getDocOutline(child.children, embeds),
      //     })
      //   }
    } else if (child.block.type === 'embed' && embeds[child.block.id]) {
      const embed = embeds[child.block.id]
      if (embed?.type === 'd') {
        const children = embed.query.refId.blockRef
          ? getBlockNode(
              embed?.data?.document?.children,
              embed.query.refId.blockRef,
            )?.children
          : embed?.data?.document?.children
        outline.push({
          id: child.block.id,
          title: embed?.data?.document?.title || 'Untitled Group',
          children: children && getDocOutline(children, embeds),
        })
      }
    } else if (child.children) {
      outline.push(...getDocOutline(child.children, embeds))
    }
  })
  return outline
}

export function activeDocOutline(
  outline: DocOutlineSection[],
  activeBlock: string | null | undefined,
  embeds: EmbedsContent,
  onBlockSelect: (blockId: string) => void,
  onNavigate: (route: NavRoute) => void,
  level = 0,
): {outlineContent: ReactNode[]; isBlockActive: boolean} {
  let isBlockActive = false
  const outlineContent = outline.map((item) => {
    const childrenOutline = item.children
      ? activeDocOutline(
          item.children,
          activeBlock,
          embeds,
          onBlockSelect,
          onNavigate,
          level + 1,
        )
      : null
    if (childrenOutline?.isBlockActive) {
      isBlockActive = true
    } else if (item.id === activeBlock) {
      isBlockActive = true
    }
    return [
      <YGroup.Item key={item.id}>
        <SidebarItem
          onPress={() => {
            if (item.linkRoute) {
              onNavigate(item.linkRoute)
            } else {
              onBlockSelect(item.id)
            }
          }}
          active={item.id === activeBlock}
          icon={
            <View width={16}>
              {item.linkRoute ? <ArrowUpRight size={16} /> : <Hash size={16} />}
            </View>
          }
          title={item.title || 'Untitled Heading'}
          indented={2 + level}
        />
      </YGroup.Item>,
      ...(childrenOutline?.outlineContent || []),
    ]
  })
  return {outlineContent, isBlockActive}
}

export function SidebarDocument({
  docId,
  docVersion,
  onPress,
  active,
  authors,
  pinVariants,
  isPinned,
}: {
  docId: string
  docVersion?: string | null
  onPress: () => void
  active?: boolean
  authors?: string[]
  pinVariants?: PublicationVariant[]
  isPinned: boolean
}) {
  const route = useNavRoute()
  const doc = usePublication({id: docId, version: docVersion || undefined})
  const isRouteActive = route.key == 'publication' && route.documentId == docId
  const embeds = usePublicationEmbeds(doc.data, isRouteActive, {
    skipCards: true,
  })
  const authorAccountsQuery = useAccounts(authors || [])
  const authorAccounts = authorAccountsQuery
    .map((query) => query.data)
    .filter(Boolean)
  if (!docId) return null
  const activeOutline =
    isRouteActive || active
      ? getDocOutline(doc?.data?.document?.children || [], embeds)
      : []
  const pubRoute = route.key == 'publication' ? route : null
  const activeBlock = pubRoute?.blockId
  const replace = useNavigate('replace')
  const navigate = useNavigate()
  const {outlineContent, isBlockActive} = activeDocOutline(
    activeOutline,
    activeBlock,
    embeds,
    (blockId) => {
      const pubRoute = route.key == 'publication' ? route : null
      if (!pubRoute) return
      replace({
        ...pubRoute,
        blockId,
      })
    },
    navigate,
  )
  return [
    <YGroup.Item>
      <SidebarItem
        onPress={onPress}
        active={(isRouteActive || active) && !isBlockActive}
        color={isPinned ? undefined : '$color11'}
        icon={
          authorAccounts.length ? (
            <XStack minWidth={26} paddingLeft={8}>
              {authorAccounts.map((account, idx) => {
                if (!account) return null

                return (
                  <XStack
                    zIndex={idx + 1}
                    marginLeft={-8}
                    borderColor="$background"
                    backgroundColor="$background"
                    borderWidth={2}
                    borderRadius={100}
                    key={account.id}
                  >
                    <UIAvatar
                      id={account.id}
                      size={22}
                      url={`${API_FILE_URL}/${account?.profile?.avatar}`}
                      label={account.profile?.alias || account.id}
                    />
                  </XStack>
                )
              })}
            </XStack>
          ) : (
            <XStack width={16}>
              <FileText />
            </XStack>
          )
        }
        title={doc.data?.document?.title || <Spinner />}
        indented
        rightHover={[]}
      />
    </YGroup.Item>,
    ...outlineContent,
  ]
}
