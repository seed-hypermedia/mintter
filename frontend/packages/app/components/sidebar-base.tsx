import {
  Account,
  API_FILE_URL,
  GroupVariant,
  PublicationVariant,
} from '@mintter/shared'
import {
  Button,
  ListItem,
  ListItemProps,
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
import {Book, FileText, Plus} from '@tamagui/lucide-icons'
import {ReactNode, useEffect, useState} from 'react'
import {useAppContext} from '../app-context'
import appError from '../errors'
import {useAccount, useAccounts} from '../models/accounts'
import {usePublication} from '../models/documents'
import {useGroup} from '../models/groups'
import {usePinAccount, usePinGroup} from '../models/pins'
import {getAccountName} from '../pages/account-page'
import {SidebarWidth, useSidebarContext} from '../src/sidebar-context'
import {getAvatarUrl} from '../utils/account-url'
import {useNavRoute} from '../utils/navigation'
import {useOpenDraft} from '../utils/open-draft'
import {NavRoute} from '../utils/routes'
import {useNavigate} from '../utils/useNavigate'
import {Avatar} from './avatar'
import {MenuItemType, OptionsDropdown} from './options-dropdown'
import {PinAccountButton, PinDocumentButton, PinGroupButton} from './pin-entity'

const HoverRegionWidth = 30

export function getRouteGroupId(route: NavRoute): string | null {
  let activeGroupRouteId: string | null = null
  if (route.key === 'group') {
    activeGroupRouteId = route.groupId
  } else if (route.key === 'publication') {
    if (route.variants) {
      const groupVariants = route.variants.filter(
        (variant) => variant.key === 'group',
      ) as GroupVariant[] | undefined
      if (groupVariants?.length === 1) {
        activeGroupRouteId = groupVariants[0]?.groupId || null
      }
    }
  } else if (
    route.key === 'draft' &&
    route.variant?.key === 'group' &&
    route.variant.groupId
  ) {
    return route.variant.groupId
  }
  return activeGroupRouteId
}

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
        // @ts-expect-error
        overflow="auto" // why does Tamagui/TS not agree that this is an acceptable value? IT WORKS!
      >
        {children}
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
  indented?: boolean
  bold?: boolean
  selected?: boolean
  rightHover?: ReactNode[]
  menuItems?: MenuItemType[]
}) {
  return (
    <View group="item">
      <ListItem
        hoverTheme
        pressTheme
        focusTheme
        minHeight={minHeight}
        paddingVertical={paddingVertical || '$2'}
        paddingHorizontal="$4"
        paddingLeft={indented ? '$8' : '$4'}
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
          <>
            <XStack opacity={0} $group-item-hover={{opacity: 1}}>
              {rightHover}
            </XStack>
            {menuItems ? (
              <OptionsDropdown hiddenUntilItemHover menuItems={menuItems} />
            ) : null}
          </>
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
}: {
  account?: Account
  onRoute: (route: NavRoute) => void
}) {
  const route = useNavRoute()
  const active = route.key == 'account' && route.accountId == account?.id
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

export function PinnedAccount({
  accountId,
  isPinned,
}: {
  accountId: string
  isPinned: boolean
}) {
  const route = useNavRoute()
  const account = useAccount(accountId)
  const navigate = useNavigate()
  let {togglePin} = usePinAccount(accountId)
  if (!accountId) return null
  return (
    <YGroup.Item>
      <SidebarItem
        onPress={() => {
          navigate({key: 'account', accountId})
        }}
        active={route.key == 'account' && route.accountId == accountId}
        color={isPinned ? undefined : '$color11'}
        icon={
          <Avatar
            size={22}
            label={account?.data?.profile?.alias}
            id={accountId}
            url={getAvatarUrl(account?.data?.profile?.avatar)}
          />
        }
        title={account.data?.profile?.alias || accountId}
        indented
        rightHover={[<PinAccountButton key="pin" accountId={accountId} />]}
      />
    </YGroup.Item>
  )
}

export function SidebarGroup(props: {
  group: {groupId: string}
  isPinned: boolean
  onPress: () => void
}) {
  const route = useNavRoute()
  const navigate = useNavigate()
  const {groupId} = props.group
  const group = useGroup(groupId)
  const {togglePin} = usePinGroup(groupId)
  if (!groupId) return null
  return (
    <YGroup.Item>
      <SidebarItem
        onPress={props.onPress}
        active={
          !props.isPinned || (route.key == 'group' && route.groupId == groupId)
        }
        icon={Book}
        color={props.isPinned ? undefined : '$color11'}
        title={group.data?.title}
        rightHover={[
          <PinGroupButton
            groupId={groupId}
            // chromeless
            key="pin"
            // onPress={(e) => {
            //   e.stopPropagation()
            //   togglePin()
            // }}
          />,
          <NewDocumentButton
            groupVariant={{key: 'group', groupId, pathName: null}}
            label="Group Document"
            key="newDoc"
          />,
        ]}
      />
    </YGroup.Item>
  )
}

export function SidebarDocument({
  docId,
  docVersion,
  onPress,
  active,
  authors,
  variants,
  isPinned,
}: {
  docId: string
  docVersion?: string | null
  onPress: () => void
  active?: boolean
  authors?: string[]
  variants: PublicationVariant[]
  isPinned: boolean
}) {
  const route = useNavRoute()
  const doc = usePublication({id: docId, version: docVersion || undefined})
  const authorAccountsQuery = useAccounts(authors || [])
  const authorAccounts = authorAccountsQuery
    .map((query) => query.data)
    .filter(Boolean)
  if (!docId) return null
  return (
    <YGroup.Item>
      <SidebarItem
        onPress={onPress}
        active={
          !isPinned || (route.key == 'publication' && route.documentId == docId)
        }
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
        rightHover={[<PinDocumentButton docId={docId} variants={variants} />]}
      />
    </YGroup.Item>
  )
}
