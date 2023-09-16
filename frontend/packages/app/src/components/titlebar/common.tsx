import {
  copyTextToClipboard,
  copyToClipboardWithFeedback,
} from '@mintter/app/copy-to-clipboard'
import {useGRPCClient, useIPC} from '@mintter/app/src/app-context'
import {Avatar} from '@mintter/app/src/components/avatar'
import {ContactsPrompt} from '@mintter/app/src/components/contacts-prompt'
import {Dropdown, MenuItem} from '@mintter/app/src/components/dropdown'
import {Tooltip} from '@mintter/ui'
import appError from '@mintter/app/src/errors'
import {useMyAccount} from '@mintter/app/src/models/accounts'
import {useDraftList} from '@mintter/app/src/models/documents'
import {useSiteList} from '@mintter/app/src/models/sites'
import {useDaemonReady} from '@mintter/app/src/node-status-context'
import {usePopoverState} from '@mintter/app/src/use-popover-state'
import {
  NavRoute,
  PublicationRoute,
  useNavRoute,
  useNavigate,
  useNavigationDispatch,
  useNavigationState,
} from '@mintter/app/src/utils/navigation'
import {useOpenDraft} from '@mintter/app/src/utils/open-draft'
import {hostnameStripProtocol} from '@mintter/app/src/utils/site-hostname'
import {getAvatarUrl} from '@mintter/app/utils/account-url'
import {NavMode, PublicationRouteContext} from '@mintter/app/utils/navigation'
import {
  Account,
  SiteConfig,
  createPublicWebHmUrl,
  unpackHmId,
} from '@mintter/shared'
import {
  Back,
  Button,
  Draft,
  Forward,
  Menu,
  Popover,
  Separator,
  Settings,
  SizableText,
  TitlebarSection,
  XGroup,
  XStack,
  YGroup,
} from '@mintter/ui'
import {
  Bookmark,
  Contact,
  Copy,
  FilePlus2,
  Globe,
  Library,
  MoreHorizontal,
  Pencil,
  Search,
  Send,
} from '@tamagui/lucide-icons'
import {memo} from 'react'
import toast from 'react-hot-toast'
import {TitleBarProps} from '.'
import {useGroup} from '../../models/groups'
import {useEditGroupInfoDialog} from '../edit-group-info'
import {AddGroupButton} from '../new-group'
import {usePublishGroupDialog} from '../publish-group'
import {DraftPublicationButtons, PageContextButton} from './publish-share'

function getRoutePubContext(
  route: NavRoute,
): PublicationRouteContext | undefined {
  if (route.key === 'publication') return route.pubContext
  if (route.key === 'draft') return route.pubContext
  if (route.key === 'group')
    return {key: 'group', groupId: route.groupId, pathName: ''}

  return null
}

function NewDocumentButton() {
  const route = useNavRoute()
  const openDraft = useOpenDraft()
  const isDaemonReady = useDaemonReady()
  return (
    <Tooltip content="New Document">
      <Button
        size="$2"
        chromeless
        disabled={!isDaemonReady}
        iconAfter={FilePlus2}
        onPress={(e) => {
          e.preventDefault()
          const pubContext = getRoutePubContext(route)
          openDraft(pubContext)
        }}
      />
    </Tooltip>
  )
}

export function GroupOptionsButton() {
  const route = useNavRoute()
  const groupId = route.key === 'group' ? route.groupId : null
  if (!groupId)
    throw new Error('GroupOptionsButton not supported in this route')
  const publish = usePublishGroupDialog()
  const myAccount = useMyAccount()
  const group = useGroup(groupId)
  const editInfo = useEditGroupInfoDialog()
  const isGroupOwner =
    myAccount.data?.id && group.data?.ownerAccountId === myAccount.data?.id
  const dropdownPopover = usePopoverState()
  if (!isGroupOwner) return null // for now, this menu contains stuff for owners only. enable it for other people one day when it contains functionality for them
  return (
    <>
      <Dropdown.Root {...dropdownPopover}>
        <Dropdown.Trigger circular icon={MoreHorizontal} />
        <Dropdown.Portal>
          <Dropdown.Content align="start">
            {isGroupOwner && (
              <>
                <Dropdown.Item
                  onPress={() => {
                    publish.open({groupId})
                  }}
                  icon={Send}
                  title={`Publish Group to Site`}
                />
                <Dropdown.Item
                  onPress={() => {
                    editInfo.open(groupId)
                  }}
                  icon={Pencil}
                  title={`Edit Group Info`}
                />
              </>
            )}
          </Dropdown.Content>
        </Dropdown.Portal>
      </Dropdown.Root>
      {publish.content}
      {editInfo.content}
    </>
  )
}

function getReferenceUrlOfRoute(route: NavRoute) {
  if (route.key === 'group') {
    const groupId = unpackHmId(route.groupId)
    if (!groupId || groupId.type !== 'g') return null
    const url = createPublicWebHmUrl('g', groupId.eid)
    return {
      label: 'Group URL',
      url,
    }
  }
  if (route.key === 'publication') {
    const docId = unpackHmId(route.documentId)
    if (!docId || docId.type !== 'd') return null
    const url = createPublicWebHmUrl('d', docId.eid, {version: route.versionId})
    if (!url) return null
    return {
      label: 'Doc URL',
      url,
    }
  }
  if (route.key === 'account') {
    const url = createPublicWebHmUrl('a', route.accountId)
    if (!url) return null
    return {
      label: 'Account URL',
      url,
    }
  }
  return null
}

function CopyReferenceButton() {
  const route = useNavRoute()
  const reference = getReferenceUrlOfRoute(route)
  if (!reference) return null
  return (
    <Tooltip content={`Copy ${reference.label}`}>
      <Button
        aria-label={`Copy ${reference.label}`}
        chromeless
        size="$2"
        icon={Copy}
        onPress={() => {
          copyToClipboardWithFeedback(reference.url, reference.label)
        }}
      ></Button>
    </Tooltip>
  )
}

export function PageActionButtons(props: TitleBarProps) {
  const route = useNavRoute()

  const commonButtons = [<NewDocumentButton key="newDoc" />]
  let buttonGroup = commonButtons
  if (route.key === 'draft') {
    buttonGroup = [<DraftPublicationButtons key="draftPublication" />]
  } else if (route.key === 'contacts') {
    buttonGroup = [<ContactsPrompt key="addContact" />, ...commonButtons]
  } else if (route.key === 'groups') {
    buttonGroup = [<AddGroupButton key="addGroup" />, ...commonButtons]
  } else if (route.key === 'group') {
    buttonGroup = [
      <GroupOptionsButton key="groupOptions" />,
      <CopyReferenceButton key="copyRef" />,
      ...commonButtons,
    ]
  } else if (route.key === 'publication') {
    buttonGroup = [
      <EditDocActions
        key="editActions"
        contextRoute={route}
        pubContext={route.pubContext || null}
        docId={route.documentId}
        baseVersion={route.versionId}
      />,
      <CopyReferenceButton key="copyRef" />,
      ...commonButtons,
    ]
  } else if (route.key === 'account') {
    buttonGroup = [<CopyReferenceButton key="copyRef" />, ...commonButtons]
  }
  return <TitlebarSection>{buttonGroup}</TitlebarSection>
}

export function PageContextButtons(props: TitleBarProps) {
  const state = useNavigationState()
  const dispatch = useNavigationDispatch()
  return (
    <XStack className="no-window-drag" gap="$2" alignItems="center">
      <XGroup backgroundColor="transparent">
        <XGroup.Item>
          <Button
            size="$2"
            onPress={() => dispatch({type: 'pop'})}
            chromeless
            disabled={state.routeIndex <= 0}
            opacity={state.routeIndex <= 0 ? 0.5 : 1}
            icon={Back}
          />
        </XGroup.Item>
        <XGroup.Item>
          <Button
            size="$2"
            onPress={() => dispatch({type: 'forward'})}
            chromeless
            disabled={state.routeIndex >= state.routes.length - 1}
            opacity={state.routeIndex >= state.routes.length - 1 ? 0.5 : 1}
            icon={Forward}
          />
        </XGroup.Item>
      </XGroup>
      <PageContextButton />
    </XStack>
  )
}

export function SitesNavDropdownItems({
  sites,
  onRoute,
}: {
  sites?: SiteConfig[]
  onRoute: (route: NavRoute) => void
}) {
  if (!sites) return null
  if (sites.length == 0) return null
  return (
    <>
      {sites.map((site) => (
        <YGroup.Item key={site.hostname}>
          <MenuItem
            onPress={() => onRoute({key: 'site', hostname: site.hostname})}
            icon={Globe}
            title={hostnameStripProtocol(site.hostname)}
          />
        </YGroup.Item>
      ))}
    </>
  )
}

export function AccountDropdownItem({
  account,
  onRoute,
}: {
  account?: Account
  onRoute: (route: NavRoute) => void
}) {
  const route = useNavRoute()
  return (
    <MenuItem
      disabled={route.key == 'account' && route.accountId == account?.id}
      onPress={() => {
        if (!account?.id) {
          appError('Account has not loaded.')
          return
        }
        onRoute({key: 'account', accountId: account?.id})
      }}
      icon={
        <Avatar
          size="$1"
          label={account?.profile?.alias}
          id={account?.id}
          url={getAvatarUrl(account?.profile?.avatar)}
        />
      }
      title={account?.profile?.alias || 'My Profile'}
    />
  )
}

function NavMenuContentUnpure({
  onClose,
  sites,
  onRoute,
}: {
  onClose: () => void
  sites?: SiteConfig[]
  onRoute: (route: NavRoute) => void
}) {
  const route = useNavRoute()
  const {send} = useIPC()
  const {data: account} = useMyAccount()

  return (
    <Popover.Content
      padding={0}
      elevation="$2"
      enterStyle={{y: -10, opacity: 0}}
      exitStyle={{y: -10, opacity: 0}}
      elevate
      animation={[
        'quick',
        {
          opacity: {
            overshootClamping: true,
          },
        },
      ]}
    >
      <YGroup separator={<Separator />} elevation="$4">
        <YGroup.Item>
          <AccountDropdownItem account={account} onRoute={onRoute} />
        </YGroup.Item>
        <YGroup.Item>
          <MenuItem
            disabled={route.key == 'home'}
            data-testid="menu-item-pubs"
            onPress={() => {
              onRoute({key: 'home'})
            }}
            title="Trusted Publications"
            icon={Bookmark}
            iconAfter={
              <SizableText size="$1" color="$mint5">
                &#8984; 1
              </SizableText>
            }
          />
        </YGroup.Item>
        <YGroup.Item>
          <MenuItem
            disabled={route.key == 'all-publications'}
            data-testid="menu-item-global"
            onPress={() => {
              onRoute({key: 'all-publications'})
            }}
            title="All Publications"
            icon={Globe}
            iconAfter={
              <SizableText size="$1" color="$mint5">
                &#8984; 2
              </SizableText>
            }
          />
        </YGroup.Item>
        <YGroup.Item>
          <MenuItem
            onPress={() => {
              onRoute({key: 'groups'})
            }}
            title="Groups"
            icon={Library}
            iconAfter={
              <SizableText size="$1" color="$mint5">
                &#8984; 3
              </SizableText>
            }
          />
        </YGroup.Item>
        <YGroup.Item>
          <MenuItem
            disabled={route.key == 'drafts'}
            data-testid="menu-item-drafts"
            onPress={() => {
              onRoute({key: 'drafts'})
            }}
            icon={Draft}
            title="Drafts"
            iconAfter={
              <SizableText size="$1" color="$mint5">
                &#8984; 8
              </SizableText>
            }
          />
        </YGroup.Item>
        <YGroup.Item>
          <MenuItem
            disabled={route.key == 'contacts'}
            onPress={() => {
              onRoute({key: 'contacts'})
            }}
            icon={Contact}
            title="Contacts"
            iconAfter={
              <SizableText size="$1" color="$mint5">
                &#8984; 9
              </SizableText>
            }
          />
        </YGroup.Item>
        <SitesNavDropdownItems sites={sites} onRoute={onRoute} />
        <YGroup.Item>
          <MenuItem
            onPress={() => {
              send('open_quick_switcher')
              onClose()
            }}
            title="Search / Open"
            icon={Search}
            iconAfter={
              <SizableText size="$1" color="$mint5">
                &#8984; K
              </SizableText>
            }
          />
        </YGroup.Item>
        <YGroup.Item>
          <MenuItem
            onPress={() => {
              onRoute({key: 'settings'})
            }}
            icon={Settings}
            title="Settings"
            iconAfter={
              <SizableText size="$1" color="$mint5">
                &#8984; ,
              </SizableText>
            }
          />
        </YGroup.Item>
      </YGroup>
    </Popover.Content>
  )
}
const NavMenuContent = memo(NavMenuContentUnpure)

export function NavMenu() {
  const sites = useSiteList()
  const popoverState = usePopoverState()

  const navigate = useNavigate()
  const spawn = useNavigate('spawn')
  return (
    <XStack paddingRight="$2" position="relative" zIndex={1000}>
      <Popover {...popoverState} placement="bottom-start">
        <Popover.Trigger asChild>
          <Button size="$2" icon={Menu} />
        </Popover.Trigger>

        <NavMenuContent
          sites={sites.data}
          onRoute={(route) => {
            popoverState.onOpenChange(false)
            setTimeout(() => {
              // this timeout is gross. we want the menu to close and not hang open during the transition. I tried React.useTransition but it seems to act too slowly
              if (route.key === 'settings') {
                spawn(route)
              } else {
                navigate(route)
              }
            }, 10)
          }}
          onClose={() => {
            popoverState.onOpenChange(false)
          }}
        />
      </Popover>
    </XStack>
  )
}

export function EditDocActions({
  docId,
  contextRoute,
  navMode = 'replace',
  pubContext,
  baseVersion,
}: {
  docId: string
  navMode?: NavMode
  contextRoute: NavRoute
  pubContext: PublicationRouteContext
  baseVersion?: string
}) {
  const draftList = useDraftList()
  const navigate = useNavigate(navMode)

  const hasExistingDraft = draftList.data?.documents.some(
    (draft) => draft.id == docId,
  )
  const grpcClient = useGRPCClient()

  async function handleEdit() {
    try {
      if (hasExistingDraft) {
        // todo, careful! this only works because draftId is docId right now
        navigate({
          key: 'draft',
          draftId: docId,
          contextRoute,
          pubContext,
        })
        return
      }
      let draft = await grpcClient.drafts.createDraft({
        existingDocumentId: docId,
        version: baseVersion,
      })
      navigate({
        key: 'draft',
        draftId: draft.id,
        contextRoute,
        pubContext,
      })
    } catch (error: any) {
      toast.error(`Draft Error: ${error?.message}`)
    }
  }

  return (
    <>
      <Tooltip content={hasExistingDraft ? 'Resume Editing' : 'Edit Document'}>
        <Button
          size="$2"
          theme={hasExistingDraft ? 'yellow' : undefined}
          onPress={() => handleEdit()}
          iconAfter={Pencil}
        />
      </Tooltip>
    </>
  )
}
