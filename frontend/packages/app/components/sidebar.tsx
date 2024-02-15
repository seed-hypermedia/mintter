import {
  Account,
  API_FILE_URL,
  AuthorVariant,
  groupsVariantsMatch,
  GroupVariant,
  PublicationVariant,
  stringArrayMatch,
} from '@mintter/shared'
import {
  Button,
  Home,
  ListItem,
  ListItemProps,
  Separator,
  SizableText,
  Spinner,
  toast,
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
  Library,
  Plus,
  Search,
  Settings,
} from '@tamagui/lucide-icons'
import {memo, ReactNode, useEffect, useState} from 'react'
import {useAppContext} from '../app-context'
import appError from '../errors'
import {useAccount, useAccounts, useMyAccount} from '../models/accounts'
import {usePublication} from '../models/documents'
import {useGroup} from '../models/groups'
import {
  usePinAccount,
  usePinDocument,
  usePinGroup,
  usePins,
} from '../models/pins'
import {getAccountName} from '../pages/account-page'
import {SidebarWidth, useSidebarContext} from '../src/sidebar-context'
import {getAvatarUrl} from '../utils/account-url'
import {useHmIdToAppRouteResolver, useNavRoute} from '../utils/navigation'
import {useOpenDraft} from '../utils/open-draft'
import {NavRoute} from '../utils/routes'
import {useNavigate} from '../utils/useNavigate'
import {useTriggerWindowEvent} from '../utils/window-events'
import {Avatar} from './avatar'
import {CreateGroupButton} from './new-group'
import {UnpinButton} from './pin-entity'

export const AppSidebar = memo(FullAppSidebar)

const HoverRegionWidth = 30

function FullAppSidebar() {
  const route = useNavRoute()
  const navigate = useNavigate()
  const account = useMyAccount()
  const pins = usePins()
  const ctx = useSidebarContext()
  const isLocked = useStream(ctx.isLocked)
  const isHoverVisible = useStream(ctx.isHoverVisible)
  const triggerFocusedWindow = useTriggerWindowEvent()
  const {platform} = useAppContext()
  const isVisible = isLocked || isHoverVisible
  let top = platform === 'darwin' ? 40 : 72
  let bottom = 24
  if (!isLocked) {
    top += 8
    bottom += 8
  }
  const isFocused = useIsWindowFocused({
    onBlur: () => ctx.onMenuHoverLeave(),
  })
  const isWindowTooNarrowForHoverSidebar = useIsWindowNarrowForHoverSidebar()
  const resolveId = useHmIdToAppRouteResolver()
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
  const pubGroupVariant = pubGroupVariants?.[0]
  const pubAuthorVariantAuthors = pubAuthorVariants?.map(
    (variant) => variant.author,
  )
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
        <YGroup
          separator={<Separator />}
          borderRadius={0}
          borderBottomWidth={1}
          borderColor="$borderColor"
        >
          {account.data && (
            <YGroup.Item>
              <MyAccountItem account={account.data} onRoute={navigate} />
            </YGroup.Item>
          )}
          <YGroup.Item>
            <SidebarItem
              active={route.key == 'feed'}
              onPress={() => {
                navigate({key: 'feed', tab: 'trusted'})
              }}
              title="Home Feed"
              bold
              icon={Home}
            />
          </YGroup.Item>
          <YGroup.Item>
            <SidebarItem
              active={route.key == 'documents'}
              data-testid="menu-item-global"
              onPress={() => {
                navigate({key: 'documents', tab: 'trusted'})
              }}
              title="Documents"
              bold
              icon={FileText}
              rightHover={[
                <NewDocumentButton key="newDoc" />,
                // <Button
                //   theme="blue"
                //   icon={Plus}
                //   size="$2"
                //   key="NewDoc"
                //   onPress={() => {}}
                // />,
              ]}
            />
          </YGroup.Item>
          {pins.data?.documents.map((pin) => {
            return (
              <PinnedDocument
                onPress={() => {
                  navigate({
                    key: 'publication',
                    documentId: pin.docId,
                    variants: pin.authors.map((author) => ({
                      key: 'author',
                      author,
                    })),
                  })
                }}
                authors={pin.authors}
                active={
                  route.key === 'publication' &&
                  route.documentId === pin.docId &&
                  pubAuthorVariantAuthors &&
                  stringArrayMatch(pin.authors, pubAuthorVariantAuthors) &&
                  groupsVariantsMatch(pin.groups, pubGroupVariants || [])
                }
                variants={pin.authors.map((author) => ({
                  key: 'author',
                  author,
                }))}
                docId={pin.docId}
                key={`${pin.docId}.${pin.authors.join('.')}`}
              />
            )
          })}
          <YGroup.Item>
            <SidebarItem
              active={route.key == 'groups'}
              onPress={() => {
                navigate({key: 'groups'})
              }}
              title="Groups"
              bold
              icon={Library}
              rightHover={[
                <Tooltip content="New Group" key="newGroup">
                  {/* Tooltip broken without this extra child View */}
                  <View>
                    <CreateGroupButton />
                  </View>
                </Tooltip>,
              ]}
            />
          </YGroup.Item>
          {pins.data?.groups
            .map((group) => {
              return [
                <PinnedGroup group={group} key={group.groupId} />,
                ...group.documents.map((pin) => {
                  if (!pin) return null
                  const {pathName, docId, docVersion} = pin
                  return (
                    <PinnedDocument
                      variants={[
                        {
                          key: 'group',
                          groupId: group.groupId,
                          pathName: pathName || '/',
                        },
                      ]}
                      onPress={async () => {
                        const resolved = await resolveId(
                          `${group.groupId}/${pathName}`,
                        )
                        if (resolved?.navRoute) {
                          navigate(resolved.navRoute)
                        } else {
                          toast.error(
                            `"${pathName}" not found in latest version of group`,
                          )
                        }
                      }}
                      active={
                        route.key === 'publication' &&
                        pubGroupVariant &&
                        pubGroupVariant.groupId === group.groupId &&
                        pubGroupVariant.pathName === pathName
                      }
                      docId={docId}
                      docVersion={docVersion}
                      key={pathName}
                    />
                  )
                }),
              ]
            })
            .flat()}

          {/* <YGroup.Item>
            <SidebarItem
              active={route.key == 'drafts'}
              data-testid="menu-item-drafts"
              onPress={() => {
                navigate({key: 'documents', tab: 'drafts' })
              }}
              icon={Draft}
              title="Drafts"
              bold
            />
          </YGroup.Item> */}
          <YGroup.Item>
            <SidebarItem
              active={route.key == 'contacts'}
              onPress={() => {
                navigate({key: 'contacts'})
              }}
              icon={Contact}
              title="Contacts"
              bold
            />
          </YGroup.Item>
          {pins.data?.accounts.map((accountId) => {
            return <PinnedAccount accountId={accountId} key={accountId} />
          })}
        </YGroup>
        <View f={1} minHeight={20} />
        <YGroup
          separator={<Separator />}
          borderRadius={0}
          borderTopWidth={1}
          borderColor="$borderColor"
        >
          <YGroup.Item>
            <SidebarItem
              onPress={() => {
                triggerFocusedWindow('openQuickSwitcher')
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

function NewDocumentButton({
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

function SidebarItem({
  disabled,
  title,
  icon,
  iconAfter,
  children,
  indented,
  bold,
  active,
  rightHover,
  ...props
}: ListItemProps & {
  indented?: boolean
  bold?: boolean
  selected?: boolean
  rightHover?: ReactNode[]
}) {
  return (
    <View group="item">
      <ListItem
        hoverTheme
        pressTheme
        focusTheme
        paddingVertical="$2"
        paddingHorizontal="$4"
        paddingLeft={indented ? '$8' : '$4'}
        textAlign="left"
        outlineColor="transparent"
        space="$2"
        backgroundColor={active ? '$blue4' : '$backgroundStrong'}
        hoverStyle={active ? {backgroundColor: '$blue4'} : {}}
        userSelect="none"
        group="item"
        color="$gray12"
        cursor={active ? undefined : 'pointer'}
        title={
          title ? (
            <SizableText
              fontSize="$3"
              color="$gray12"
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
          <XStack opacity={0} $group-item-hover={{opacity: 1}}>
            {rightHover}
          </XStack>
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

function PinnedAccount({accountId}: {accountId: string}) {
  const route = useNavRoute()
  const account = useAccount(accountId)
  const navigate = useNavigate()
  let {togglePin} = usePinAccount(accountId)
  if (!accountId) return null
  return (
    <YGroup.Item>
      {/* <AccountCard accountId={accountId}> */}
      <SidebarItem
        onPress={() => {
          navigate({key: 'account', accountId})
        }}
        active={route.key == 'account' && route.accountId == accountId}
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
        rightHover={[
          <UnpinButton
            key="pin"
            onPress={(e) => {
              e.stopPropagation()
              togglePin()
            }}
          />,
        ]}
      />
      {/* </AccountCard> */}
    </YGroup.Item>
  )
}

function PinnedGroup(props: {group: {groupId: string}}) {
  const route = useNavRoute()
  const navigate = useNavigate()
  const {groupId} = props.group
  const group = useGroup(groupId)
  const {togglePin} = usePinGroup(groupId)
  if (!groupId) return null
  return (
    <YGroup.Item>
      <SidebarItem
        onPress={() => {
          navigate({key: 'group', groupId})
        }}
        active={route.key == 'group' && route.groupId == groupId}
        icon={Book}
        title={group.data?.title}
        rightHover={[
          <UnpinButton
            key="pin"
            onPress={(e) => {
              e.stopPropagation()
              togglePin()
            }}
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

function PinnedDocument({
  docId,
  docVersion,
  onPress,
  active,
  authors,
  variants,
}: {
  docId: string
  docVersion?: string | null
  onPress: () => void
  active?: boolean
  authors?: string[]
  variants: PublicationVariant[]
}) {
  const doc = usePublication({id: docId, version: docVersion || undefined})
  const {togglePin} = usePinDocument({
    key: 'publication',
    documentId: docId,
    variants,
  })
  const authorAccountsQuery = useAccounts(authors || [])
  const authorAccounts = authorAccountsQuery
    .map((query) => query.data)
    .filter(Boolean)
  if (!docId) return null
  return (
    <YGroup.Item>
      <SidebarItem
        onPress={onPress}
        active={active}
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
        rightHover={[
          <UnpinButton
            key="pin"
            onPress={(e) => {
              e.stopPropagation()
              togglePin()
            }}
          />,
        ]}
      />
    </YGroup.Item>
  )
}
