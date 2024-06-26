import { useAppContext } from '@/app-context'
import { Avatar } from '@/components/avatar'
import { MenuItemType, OptionsDropdown } from '@/components/options-dropdown'
import appError from '@/errors'
import { EmbedsContent } from '@/models/documents'
import { getProfileName } from '@/pages/account-page'
import { SidebarWidth, useSidebarContext } from '@/sidebar-context'
import { getAvatarUrl } from '@/utils/account-url'
import { NavRoute } from '@/utils/routes'
import { useNavigate } from '@/utils/useNavigate'
import { useTriggerWindowEvent } from '@/utils/window-events'
import {
  Account,
  getBlockNode,
  HMBlockNode,
  UnpackedHypermediaId,
} from '@shm/shared'
import {
  Button,
  ListItem,
  ListItemProps,
  Separator,
  SizableText,
  Tooltip,
  useStream,
  View,
  XStack,
  YStack,
} from '@shm/ui'
import {
  ArrowDownRight,
  ChevronDown,
  ChevronRight,
  Contact,
  FileText,
  Hash,
  Search,
  Settings,
} from '@tamagui/lucide-icons'
import {
  ComponentProps,
  createElement,
  FC,
  isValidElement,
  ReactNode,
  useEffect,
  useState,
} from 'react'

const HoverRegionWidth = 30

export function GenericSidebarContainer({ children }: { children: ReactNode }) {
  const ctx = useSidebarContext()
  const isFocused = useIsWindowFocused({
    onBlur: () => ctx.onMenuHoverLeave(),
  })
  const isWindowTooNarrowForHoverSidebar = useIsWindowNarrowForHoverSidebar()
  const isLocked = useStream(ctx.isLocked)
  const isHoverVisible = useStream(ctx.isHoverVisible)
  const isVisible = isLocked || isHoverVisible
  const { platform } = useAppContext()
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
          overflow="auto" // why does Tamagui/TS not agree that this is an acceptable value? IT WORKS!
        // paddingVertical="$2"
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
                navigate({ key: 'settings' })
              }}
              icon={Settings}
            />
          </Tooltip>
        </XStack>
      </YStack>
    </>
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
  activeBgColor,
  rightHover,
  color,
  paddingVertical,
  minHeight,
  menuItems,
  isCollapsed,
  onSetCollapsed,
  ...props
}: ListItemProps & {
  indented?: boolean | number
  bold?: boolean
  activeBgColor?: ComponentProps<typeof ListItem>['backgroundColor']
  selected?: boolean
  rightHover?: ReactNode[]
  menuItems?: MenuItemType[]
  isCollapsed?: boolean | null
  onSetCollapsed?: (collapsed: boolean) => void
}) {
  const indent = indented ? (typeof indented === 'number' ? indented : 1) : 0
  const activeBg = activeBgColor || '$blue4'
  return (
    <View>
      <ListItem
        hoverTheme
        pressTheme
        focusTheme
        minHeight={minHeight || 32}
        paddingVertical={paddingVertical || '$1'}
        paddingHorizontal="$2"
        size="$2"
        paddingLeft={Math.max(0, indent - 1) * 22 + 28}
        textAlign="left"
        outlineColor="transparent"
        backgroundColor={active ? activeBg : '$colorTransparent'}
        hoverStyle={active ? { backgroundColor: activeBg } : {}}
        userSelect="none"
        gap="$2"
        group="item"
        color={color || '$gray12'}
        cursor={active ? undefined : 'pointer'}
        title={undefined}
        iconAfter={
          iconAfter || (
            <>
              <XStack opacity={0} $group-item-hover={{ opacity: 1 }}>
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
        <XStack gap="$2" jc="center" f={1}>
          {isValidElement(icon) ? (
            icon
          ) : icon ? (
            <View width={18}>{createElement(icon, { size: 18 })}</View>
          ) : (
            <View width={18} />
          )}
          {children}
          <SizableText
            f={1}
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            width="100%"
            overflow="hidden"
            fontSize="$3"
            color={color || '$gray12'}
            cursor={active ? undefined : 'pointer'}
            fontWeight={bold ? 'bold' : undefined}
            userSelect="none"
          >
            {title}
          </SizableText>
          {isCollapsed != null ? (
            <Button
              position="absolute"
              left={-24}
              size="$1"
              chromeless
              backgroundColor={'$colorTransparent'}
              onPress={(e) => {
                e.stopPropagation()
                onSetCollapsed?.(!isCollapsed)
              }}
              icon={isCollapsed ? ChevronRight : ChevronDown}
            />
          ) : null}
        </XStack>
      </ListItem>
    </View>
  )
}

export function SidebarGroupItem({
  items,
  defaultExpanded,
  ...props
}: {
  items: ReactNode[]
  defaultExpanded?: boolean
} & ComponentProps<typeof SidebarItem>) {
  const [isCollapsed, setIsCollapsed] = useState(defaultExpanded ? false : true)
  return (
    <>
      <SidebarItem
        {...props}
        isCollapsed={items.length ? isCollapsed : null}
        onSetCollapsed={setIsCollapsed}
      />
      {isCollapsed ? null : items}
    </>
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
      hoverStyle={active ? { backgroundColor: '$blue4' } : {}}
      cursor={active ? undefined : 'pointer'}
      title={
        <YStack>
          <SizableText
            fontSize="$2"
            fontWeight={'bold'}
            cursor={active ? 'not-allowed' : 'pointer'}
            userSelect="none"
          >
            {getProfileName(account?.profile)}
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
        onRoute({ key: 'account', accountId: account?.id })
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
      }
    } else if (child.children) {
      outline.push(
        ...getDocOutline(child.children, embeds, parentEntityId, parentBlockId),
      )
    }
  })
  return outline
}

export function FocusButton({
  onPress,
  label,
}: {
  onPress: () => void
  label?: string
}) {
  return (
    <Tooltip content={label ? `Focus ${label}` : 'Focus'}>
      <Button
        icon={ArrowDownRight}
        onPress={(e) => {
          e.stopPropagation()
          onPress()
        }}
        chromeless
        backgroundColor={'$colorTransparent'}
        size="$1"
      />
    </Tooltip>
  )
}

export function activeDocOutline(
  outline: DocOutlineSection[],
  activeBlock: string | null | undefined,
  focusBlock: string | null | undefined,
  embeds: EmbedsContent,
  onBlockSelect: (
    blockId: string,
    entityId: UnpackedHypermediaId | undefined,
    parentBlockId: string | undefined,
  ) => void,
  onBlockFocus: (
    blockId: string,
    entityId: UnpackedHypermediaId | undefined,
    parentBlockId: string | undefined,
  ) => void,
  onNavigate: (route: NavRoute) => void,
  level = 0,
): {
  outlineContent: ReactNode[]
  isBlockActive: boolean
  isBlockFocused: boolean
} {
  let isBlockActive = false
  let isBlockFocused = false
  const outlineContent = outline.map((item) => {
    const childrenOutline = item.children
      ? activeDocOutline(
        item.children,
        activeBlock,
        focusBlock,
        embeds,
        onBlockSelect,
        onBlockFocus,
        onNavigate,
        level + 1,
      )
      : null
    if (childrenOutline?.isBlockActive) {
      isBlockActive = true
    } else if (item.id === activeBlock) {
      isBlockActive = true
    }
    if (childrenOutline?.isBlockFocused) {
      isBlockFocused = true
    } else if (item.id === focusBlock) {
      isBlockFocused = true
    }
    return (
      <SidebarGroupItem
        onPress={() => {
          onBlockSelect(item.id, item.entityId, item.parentBlockId)
        }}
        active={item.id === activeBlock || item.id === focusBlock}
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
        indented={2 + level}
        items={childrenOutline?.outlineContent || []}
        rightHover={[
          <FocusButton
            key="focus"
            onPress={() => {
              onBlockFocus(item.id, item.entityId, item.parentBlockId)
            }}
          />,
        ]}
        defaultExpanded
      />
    )
  })
  return { outlineContent, isBlockActive, isBlockFocused }
}

export function SidebarDivider() {
  return <Separator marginVertical="$2" />
}
