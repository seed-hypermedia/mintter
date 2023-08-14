import {Dropdown, MenuItem} from '@mintter/app/src/components/dropdown'
import appError from '@mintter/app/src/errors'
import {useMyAccount} from '@mintter/app/src/models/accounts'
import {useDraftList} from '@mintter/app/src/models/documents'
import {useSiteList} from '@mintter/app/src/models/sites'
import {useDaemonReady} from '@mintter/app/src/node-status-context'
import {
  PublicationRoute,
  useNavigate,
  useNavigationDispatch,
  useNavigationState,
  useNavRoute,
  NavRoute,
} from '@mintter/app/src/utils/navigation'
import {useOpenDraft} from '@mintter/app/src/utils/open-draft'
import {hostnameStripProtocol} from '@mintter/app/src/utils/site-hostname'
import {Avatar} from '@mintter/app/src/components/avatar'
import {ContactsPrompt} from '@mintter/app/src/components/contacts-prompt'
import {Account, DocumentChange, SiteConfig} from '@mintter/shared'
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
  User,
  XGroup,
  XStack,
  YGroup,
} from '@mintter/ui'
import toast from 'react-hot-toast'
import {TitleBarProps} from '.'
import {PublicationDropdown, PublishShareButton} from './publish-share'
import {
  CircleEllipsis,
  Copy,
  FilePlus2,
  Folder,
  Globe,
  MoreHorizontal,
  Pencil,
  Search,
  Send,
  Trash,
} from '@tamagui/lucide-icons'
import {Tooltip} from '@mintter/app/src/components/tooltip'
import {memo} from 'react'
import {usePopoverState} from '@mintter/app/src/use-popover-state'
import {useIPC} from '@mintter/app/src/app-context'
import {useGRPCClient} from '@mintter/app/src/app-context'
import {AddGroupButton} from '../new-group'
import {usePublishGroupDialog} from '../publish-group'
import {useEditGroupInfoDialog} from '../edit-group-info'

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
          const host = route.key === 'site' ? route.hostname : undefined
          // @ts-ignore
          openDraft(!e.shiftKey, host)
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
  const editInfo = useEditGroupInfoDialog()
  return (
    <>
      <Dropdown.Root {...usePopoverState()}>
        <Dropdown.Trigger circular icon={MoreHorizontal} />
        <Dropdown.Portal>
          <Dropdown.Content align="start">
            {/* <Dropdown.Item
              onPress={() => {}}
              icon={Trash}
              title={`Delete Group`}
            /> */}
            <Dropdown.Item
              onPress={() => {
                publish.open(groupId)
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
          </Dropdown.Content>
        </Dropdown.Portal>
      </Dropdown.Root>
      {publish.content}
      {editInfo.content}
    </>
  )
}

export function ActionButtons(props: TitleBarProps) {
  const route = useNavRoute()

  let buttonGroup = [<NewDocumentButton key="newDoc" />]
  if (route.key === 'draft') {
    buttonGroup = []
  } else if (route.key === 'contacts') {
    buttonGroup = [<ContactsPrompt key="addContact" />]
  } else if (route.key === 'groups') {
    buttonGroup = [<AddGroupButton key="addGroup" />]
  } else if (route.key === 'group') {
    buttonGroup = [
      <GroupOptionsButton key="groupOptions" />,
      <NewDocumentButton key="newDoc" />,
    ]
  }
  return (
    <TitlebarSection>
      {route.key == 'publication' ? <WriteActions route={route} /> : null}
      <PublishShareButton />
      {buttonGroup}
    </TitlebarSection>
  )
}

export function NavigationButtons() {
  const state = useNavigationState()
  const dispatch = useNavigationDispatch()
  return (
    <XStack>
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
      <PublicationDropdown />
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
          alias={account?.profile?.alias || '.'}
          accountId={account?.id}
        />
      }
      title={account?.profile?.alias || '<me>'}
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
    <Popover.Content padding={0} elevation="$2">
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
            title="Publications"
            icon={Folder}
            iconAfter={
              <SizableText size="$1" color="$mint5">
                &#8984; 1
              </SizableText>
            }
          />
        </YGroup.Item>
        <YGroup.Item>
          <MenuItem
            disabled={route.key == 'global-publications'}
            data-testid="menu-item-global"
            onPress={() => {
              onRoute({key: 'global-publications'})
            }}
            title="Global Publications"
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
            icon={Folder}
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
            icon={User}
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

function WriteActions({route}: {route: PublicationRoute}) {
  const draftList = useDraftList()
  const navigateReplace = useNavigate('replace')

  const hasExistingDraft = draftList.data?.documents.some(
    (draft) => draft.id == route.documentId,
  )
  const grpcClient = useGRPCClient()

  async function handleEdit() {
    try {
      if (hasExistingDraft) {
        // todo, careful! this only works because draftId is docId right now
        navigateReplace({
          key: 'draft',
          draftId: route.documentId,
          contextRoute: route,
        })
        return
      }
      let draft = await grpcClient.drafts.createDraft({
        existingDocumentId: route.documentId,
        version: route.versionId,
      })
      if (draft.webUrl) {
        // the previous version had a webUrl set.
        // we should check if the user has the site added. if not, set the webUrl to empty
        const sites = await grpcClient.webPublishing.listSites({})
        const foundPublishingSite = sites.sites.find(
          (site) => site.hostname === draft.webUrl,
        )
        if (!foundPublishingSite) {
          await grpcClient.drafts.updateDraft({
            documentId: draft.id,
            changes: [
              new DocumentChange({
                op: {case: 'setWebUrl', value: ''},
              }),
            ],
          })
        }
      }

      navigateReplace({
        key: 'draft',
        draftId: draft.id,
        contextRoute: route,
      })
    } catch (error: any) {
      toast.error(`Draft Error: ${error?.message}`)
    }
  }

  return (
    <>
      {route.key == 'publication' && (
        <Tooltip
          content={hasExistingDraft ? 'Resume Editing' : 'Edit Document'}
        >
          <Button
            // chromeless
            size="$2"
            theme={hasExistingDraft ? 'yellow' : undefined}
            onPress={() => handleEdit()}
            iconAfter={Pencil}
          />
        </Tooltip>
      )}
    </>
  )
}
