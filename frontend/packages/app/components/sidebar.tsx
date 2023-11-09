import {trpc} from '@mintter/desktop/src/trpc'
import {Account, unpackHmId} from '@mintter/shared'
import {
  Draft,
  ListItem,
  ScrollView,
  Separator,
  SizableText,
  View,
  XStack,
  YGroup,
  YStack,
  YStackProps,
  useStream,
} from '@mintter/ui'
import {
  Book,
  Bookmark,
  Contact,
  FileText,
  Globe,
  Library,
  Search,
  Settings,
  User,
} from '@tamagui/lucide-icons'
import {useAccount, useMyAccount} from '../models/accounts'
import {usePublication} from '../models/documents'
import {useGroup} from '../models/groups'
import {SidebarWidth, useSidebarContext} from '../src/sidebar-context'
import {NavRoute, useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'
import {MenuItem} from './dropdown'
import {useTriggerWindowEvent} from '../utils/window-events'
import {Avatar} from './avatar'
import {getAvatarUrl} from '../utils/account-url'
import {memo} from 'react'
import appError from '../errors'
import {useAppContext} from '../app-context'

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
  return (
    <YStack
      backgroundColor={'$color1'}
      borderRightWidth={1}
      borderColor={'$color4'}
      position="absolute"
      left={isVisible ? 0 : -(SidebarWidth - 50)}
      width={SidebarWidth}
      top={platform === 'darwin' ? 40 : 72}
      bottom={24}
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
          <MenuItem
            active={route.key == 'home'}
            data-testid="menu-item-pubs"
            onPress={() => {
              navigate({key: 'home'})
            }}
            title="Trusted Publications"
            bold
            icon={Bookmark}
            iconAfter={null}
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
          <MenuItem
            active={route.key == 'all-publications'}
            data-testid="menu-item-global"
            onPress={() => {
              navigate({key: 'all-publications'})
            }}
            title="All Publications"
            bold
            icon={Globe}
            iconAfter={null}
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
          <MenuItem
            active={route.key == 'groups'}
            onPress={() => {
              navigate({key: 'groups'})
            }}
            title="Groups"
            bold
            icon={Library}
            iconAfter={null}
          />
        </YGroup.Item>
        {pins.data?.groups.map((group) => {
          return (
            <>
              <PinnedGroup group={group} key={group.groupId} />
              {group.documents.map(({docId, pathName}) => {
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
              })}
            </>
          )
        })}

        <YGroup.Item>
          <MenuItem
            active={route.key == 'drafts'}
            data-testid="menu-item-drafts"
            onPress={() => {
              navigate({key: 'drafts'})
            }}
            icon={Draft}
            title="Drafts"
            bold
            iconAfter={null}
          />
        </YGroup.Item>
        <YGroup.Item>
          <MenuItem
            active={route.key == 'contacts'}
            onPress={() => {
              navigate({key: 'contacts'})
            }}
            icon={Contact}
            title="Accounts"
            bold
            iconAfter={null}
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
          <MenuItem
            onPress={() => {
              triggerFocusedWindow('openQuickSwitcher')
            }}
            title="Search / Open"
            icon={Search}
            iconAfter={null}
          />
        </YGroup.Item>
        <YGroup.Item>
          <MenuItem
            onPress={() => {
              spawn({key: 'settings'})
            }}
            cursor="pointer"
            icon={Settings}
            title="Settings"
            iconAfter={null}
          />
        </YGroup.Item>
      </YGroup>
    </YStack>
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
      <MenuItem
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
        iconAfter={null}
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
      <MenuItem
        onPress={() => {
          navigate({key: 'group', groupId})
        }}
        active={route.key == 'group' && route.groupId == groupId}
        icon={Book}
        title={group.data?.title}
        iconAfter={null}
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
      <MenuItem
        onPress={onPress}
        active={active}
        icon={FileText}
        title={doc.data?.document?.title || docId}
        iconAfter={null}
        indented
      />
    </YGroup.Item>
  )
}
