import {trpc} from '@mintter/desktop/src/trpc'
import {Account} from '@mintter/shared'
import {
  Button,
  Draft,
  ListItem,
  ListItemProps,
  Separator,
  SizableText,
  Tooltip,
  View,
  XStack,
  YGroup,
  YStack,
  useStream,
} from '@mintter/ui'
import {
  Book,
  Bookmark,
  Contact,
  FileText,
  Globe,
  Library,
  Plus,
  Search,
  Settings,
} from '@tamagui/lucide-icons'
import {ReactNode, memo} from 'react'
import {useAppContext} from '../app-context'
import appError from '../errors'
import {useAccount, useMyAccount} from '../models/accounts'
import {usePublication} from '../models/documents'
import {useGroup} from '../models/groups'
import {SidebarWidth, useSidebarContext} from '../src/sidebar-context'
import {getAvatarUrl} from '../utils/account-url'
import {
  NavRoute,
  PublicationRouteContext,
  useNavRoute,
} from '../utils/navigation'
import {useOpenDraft} from '../utils/open-draft'
import {useNavigate} from '../utils/useNavigate'
import {useTriggerWindowEvent} from '../utils/window-events'
import {Avatar} from './avatar'
import {CreateGroupButton} from './new-group'

export const AppSidebar = memo(FullAppSidebar)

function FullAppSidebar() {
  const route = useNavRoute()
  const navigate = useNavigate()
  const spawn = useNavigate('spawn')
  const account = useMyAccount()
  const pins = trpc.pins.get.useQuery()
  const ctx = useSidebarContext()
  const isLocked = useStream(ctx.isLocked)
  const isHoverVisible = useStream(ctx.isHoverVisible)
  const triggerFocusedWindow = useTriggerWindowEvent()
  const {platform} = useAppContext()
  const isVisible = isLocked || isHoverVisible
  let top = platform === 'darwin' ? 40 : 72
  if (!isLocked) {
    top += 8
  }
  let bottom = isLocked ? 24 : 32
  return (
    <YStack
      backgroundColor={'$color1'}
      borderRightWidth={1}
      borderColor={'$color4'}
      animation="fast"
      position="absolute"
      x={isVisible ? 0 : -(SidebarWidth - 50)}
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
      overflow="scroll"
    >
      <YGroup
        separator={<Separator />}
        borderRadius={0}
        borderBottomWidth={1}
        borderColor="$borderColor"
      >
        <YGroup.Item>
          <MyAccountItem account={account.data} onRoute={navigate} />
        </YGroup.Item>
        <YGroup.Item>
          <SidebarItem
            active={route.key == 'home'}
            data-testid="menu-item-pubs"
            onPress={() => {
              navigate({key: 'home'})
            }}
            title="Trusted Publications"
            bold
            icon={Bookmark}
            rightHover={[
              <NewDocumentButton pubContext={{key: 'trusted'}} key="newDoc" />,
            ]}
          />
        </YGroup.Item>
        {pins.data?.trustedDocuments.map((documentId) => {
          return (
            <PinnedDocument
              onPress={() => {
                navigate({
                  key: 'publication',
                  documentId,
                  pubContext: {key: 'trusted'},
                })
              }}
              active={
                route.key === 'publication' &&
                route.documentId === documentId &&
                route.pubContext?.key === 'trusted'
              }
              docId={documentId}
              key={documentId}
            />
          )
        })}
        <YGroup.Item>
          <SidebarItem
            active={route.key == 'all-publications'}
            data-testid="menu-item-global"
            onPress={() => {
              navigate({key: 'all-publications'})
            }}
            title="All Publications"
            bold
            icon={Globe}
            rightHover={[
              <NewDocumentButton pubContext={null} key="newDoc" />,
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
        {pins.data?.allDocuments.map((documentId) => {
          return (
            <PinnedDocument
              onPress={() => {
                navigate({
                  key: 'publication',
                  documentId,
                })
              }}
              active={
                route.key === 'publication' &&
                route.documentId === documentId &&
                !route.pubContext
              }
              docId={documentId}
              key={documentId}
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
              ...group.documents.map(({docId, pathName}) => {
                return (
                  <PinnedDocument
                    onPress={() => {
                      navigate({
                        key: 'publication',
                        documentId: docId,
                        pubContext: {
                          key: 'group',
                          groupId: group.groupId,
                          pathName: pathName || '/',
                        },
                      })
                    }}
                    active={
                      route.key === 'publication' &&
                      route.documentId === docId &&
                      route.pubContext?.key === 'group' &&
                      route.pubContext.groupId === group.groupId &&
                      route.pubContext.pathName === pathName
                    }
                    docId={docId}
                    key={docId}
                  />
                )
              }),
            ]
          })
          .flat()}

        <YGroup.Item>
          <SidebarItem
            active={route.key == 'drafts'}
            data-testid="menu-item-drafts"
            onPress={() => {
              navigate({key: 'drafts'})
            }}
            icon={Draft}
            title="Drafts"
            bold
          />
        </YGroup.Item>
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
              spawn({key: 'settings'})
            }}
            cursor="pointer"
            icon={Settings}
            title="Settings"
          />
        </YGroup.Item>
      </YGroup>
    </YStack>
  )
}

function NewDocumentButton({
  pubContext,
  label,
}: {
  pubContext: PublicationRouteContext
  label?: string
}) {
  const openDraft = useOpenDraft()
  return (
    <Tooltip content={`New ${label || 'Document'}`}>
      <Button
        size="$2"
        chromeless
        iconAfter={Plus}
        onPress={(e) => {
          e.preventDefault()
          openDraft(pubContext)
        }}
      />
    </Tooltip>
  )
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
        backgroundColor={active ? '$blue4' : undefined}
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
          <XStack
            opacity={0}
            $group-item-hover={{opacity: 1}}
            // backgroundColor={'blue'}
          >
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
            {account?.profile?.alias || 'Anonymous'}
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
  if (!accountId) return null
  return (
    <YGroup.Item>
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
      />
    </YGroup.Item>
  )
}

function PinnedGroup(props: {group: {groupId: string}}) {
  const route = useNavRoute()
  const navigate = useNavigate()
  const {groupId} = props.group
  const group = useGroup(groupId)
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
          <NewDocumentButton
            pubContext={{key: 'group', groupId, pathName: null}}
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
  onPress,
  active,
}: {
  docId: string
  onPress: () => void
  active?: boolean
}) {
  const doc = usePublication({id: docId})
  if (!docId) return null
  return (
    <YGroup.Item>
      <SidebarItem
        onPress={onPress}
        active={active}
        icon={FileText}
        title={doc.data?.document?.title || docId}
        indented
      />
    </YGroup.Item>
  )
}
