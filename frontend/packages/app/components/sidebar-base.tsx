import {
  Account,
  API_FILE_URL,
  getBlockNode,
  GroupVariant,
  HMBlockNode,
  PublicationVariant,
  UnpackedHypermediaId,
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
  Book,
  Contact,
  FileText,
  Hash,
  Plus,
  Search,
  Settings,
} from '@tamagui/lucide-icons'
import {ComponentProps, FC, ReactNode, useEffect, useState} from 'react'
import {useAppContext} from '../app-context'
import appError from '../errors'
import {useAccounts} from '../models/accounts'
import {
  EmbedsContent,
  useDocumentEmbeds,
  usePublication,
} from '../models/documents'
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
          paddingVertical="$2"
        >
          {children}
        </YStack>
        <XStack
          padding="$2"
          jc="space-between"
          borderTopWidth={1}
          borderColor="$borderColor"
        >
          <Tooltip content="Search / Open">
            <Button
              size="$3"
              backgroundColor={'$colorTransparent'}
              chromeless
              onPress={() => {
                triggerFocusedWindow('openLauncher')
              }}
              icon={Search}
            />
          </Tooltip>
          <Tooltip content="App Settings">
            <Button
              size="$3"
              backgroundColor={'$colorTransparent'}
              chromeless
              onPress={() => {
                navigate({key: 'settings'})
              }}
              icon={Settings}
            />
          </Tooltip>
        </XStack>
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
        minHeight={minHeight || 35}
        paddingVertical={paddingVertical || '$1'}
        paddingHorizontal="$4"
        paddingLeft={indent * 10 + 18}
        textAlign="left"
        outlineColor="transparent"
        // space="$2"
        backgroundColor={active ? '$blue4' : '$colorTransparent'}
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
      backgroundColor={active ? '$blue4' : '$colorTransparent'}
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
  entityId?: UnpackedHypermediaId
  parentBlockId?: string
  children?: DocOutlineSection[]
  icon?: FC<ComponentProps<typeof Hash>>
}
type DocOutline = DocOutlineSection[]

export function getDocOutline(
  children: HMBlockNode[],
  embeds: EmbedsContent,
  parentEntityId?: UnpackedHypermediaId,
  parentBlockId?: string,
): DocOutline {
  const outline: DocOutline = []
  children.forEach((child) => {
    if (child.block.type === 'heading') {
      outline.push({
        id: child.block.id,
        title: child.block.text,
        entityId: parentEntityId,
        parentBlockId,
        children:
          child.children &&
          getDocOutline(child.children, embeds, parentEntityId, parentBlockId),
      })
    } else if (
      child.block.type === 'embed' &&
      child.block.attributes?.view === 'card' &&
      embeds[child.block.id]
    ) {
      const embed = embeds[child.block.id]
      if (embed?.type === 'd') {
        outline.push({
          id: child.block.id,
          title: embed?.data?.document?.title || 'Untitled Document',
          entityId: embed.query.refId,
          parentBlockId,
          icon: FileText,
        })
      } else if (embed?.type === 'a') {
        outline.push({
          id: child.block.id,
          title: embed?.data?.profile?.alias || 'Untitled Account',
          entityId: embed.query.refId,
          parentBlockId,
          icon: Contact,
        })
      } else if (embed?.type === 'g') {
        outline.push({
          id: child.block.id,
          title: embed?.data?.title || 'Untitled Group',
          entityId: embed.query.refId,
          parentBlockId,
          icon: Book,
        })
      }
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
          children:
            children &&
            getDocOutline(children, embeds, embed.query.refId, child.block.id),
          icon: FileText,
        })
      } else if (embed?.type === 'a') {
        outline.push({
          id: child.block.id,
          title: embed?.data?.profile?.alias || 'Untitled Account',
          entityId: embed.query.refId,
          parentBlockId,
          icon: Contact,
        })
      } else if (embed?.type === 'g') {
        outline.push({
          id: child.block.id,
          title: embed?.data?.title || 'Untitled Group',
          entityId: embed.query.refId,
          parentBlockId,
          icon: Book,
        })
      }
    } else if (child.children) {
      outline.push(
        ...getDocOutline(child.children, embeds, parentEntityId, parentBlockId),
      )
    }
  })
  return outline
}

export function activeDocOutline(
  outline: DocOutlineSection[],
  activeBlock: string | null | undefined,
  embeds: EmbedsContent,
  onBlockSelect: (
    blockId: string,
    entityId: UnpackedHypermediaId | undefined,
    parentBlockId: string | undefined,
  ) => void,
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
      <SidebarItem
        onPress={() => {
          onBlockSelect(item.id, item.entityId, item.parentBlockId)
        }}
        active={item.id === activeBlock}
        icon={
          <View width={16}>
            {item.icon ? <item.icon size={16} /> : <Hash size={16} />}
          </View>
        }
        title={item.title || 'Untitled Heading'}
        indented={2 + level}
      />,
      ...(childrenOutline?.outlineContent || []),
    ]
  })
  return {outlineContent, isBlockActive}
}

export function SidebarDivider() {
  return <Separator marginVertical="$2" />
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
  const embeds = useDocumentEmbeds(doc.data?.document, isRouteActive, {
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
