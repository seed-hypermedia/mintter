import {draftsClient, webPublishingClient} from '@app/api-clients'
import {Dropdown, MenuItem} from '@components/dropdown'
import appError from '@app/errors'
import {send} from '@app/ipc'
import {useMyAccount} from '@app/models/accounts'
import {useDraftList} from '@app/models/documents'
import {useSiteList} from '@app/models/sites'
import {useDaemonReady} from '@app/node-status-context'
import {
  PublicationRoute,
  useNavigate,
  useNavigationDispatch,
  useNavigationState,
  useNavRoute,
  NavRoute,
} from '@app/utils/navigation'
import {useOpenDraft} from '@app/utils/open-draft'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {Avatar} from '@components/avatar'
import {ContactsPrompt} from '@components/contacts-prompt'
import {
  Account,
  createHyperdocsDocLink,
  DocumentChange,
  HYPERDOCS_LINK_PREFIX,
  SiteConfig,
} from '@mintter/shared'
import {
  Add,
  Back,
  Button,
  Draft,
  File,
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
import copyTextToClipboard from 'copy-text-to-clipboard'
import toast from 'react-hot-toast'
import {TitleBarProps} from '.'
import {PublicationDropdown, PublishShareButton} from './publish-share'
import {FilePlus2, Globe, Pencil} from '@tamagui/lucide-icons'
import {Tooltip} from '@components/tooltip'
import {memo, useState} from 'react'
import {usePopoverState} from '@app/use-popover-state'

export function ActionButtons(props: TitleBarProps) {
  const openDraft = useOpenDraft()
  const route = useNavRoute()
  const isDaemonReady = useDaemonReady()

  const onCopy =
    route.key == 'publication'
      ? () => {
          const reference = createHyperdocsDocLink(
            route.documentId,
            route.versionId,
            route.blockId,
          )
          copyTextToClipboard(reference)
          toast.success('Document reference copied!')
        }
      : undefined

  return (
    <TitlebarSection>
      {route.key == 'publication' ? <WriteActions route={route} /> : null}

      <PublishShareButton />

      {route.key == 'draft' ? null : (
        <div className="button-group">
          {route.key == 'connections' ? (
            <ContactsPrompt />
          ) : (
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
          )}
        </div>
      )}
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
        <Dropdown.Item
          key={site.hostname}
          onPress={() => onRoute({key: 'site', hostname: site.hostname})}
          icon={Globe}
          title={hostnameStripProtocol(site.hostname)}
        />
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

function NaveMenuContentUnpure({
  onClose,
  sites,
  onRoute,
}: {
  onClose: () => void
  sites?: SiteConfig[]
  onRoute: (route: NavRoute) => void
}) {
  const route = useNavRoute()
  const {data: account} = useMyAccount()

  return (
    <Dropdown.Content align="start">
      <YGroup separator={<Separator />} elevation="$4">
        <YGroup.Item>
          <AccountDropdownItem account={account} onRoute={onRoute} />
        </YGroup.Item>
        <YGroup.Item>
          <MenuItem
            disabled={route.key == 'home'}
            data-testid="menu-item-inbox"
            onPress={() => {
              onRoute({key: 'home'})
            }}
            title="All Publications"
            icon={File}
            iconAfter={
              <SizableText size="$1" color="$mint5">
                &#8984; 1
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
            disabled={route.key == 'connections'}
            onPress={() => {
              onRoute({key: 'connections'})
            }}
            icon={User}
            title="Connections"
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
            title="Quick Switcher"
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
    </Dropdown.Content>
  )
}
const NavMenuContent = memo(NaveMenuContentUnpure)

export function NavMenu() {
  const sites = useSiteList()
  const popoverState = usePopoverState()

  const navigate = useNavigate()
  const spawn = useNavigate('spawn')
  return (
    <XStack paddingRight="$2" position="relative">
      <Dropdown.Root {...popoverState}>
        <Dropdown.Trigger size="$2" icon={Menu} />

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
      </Dropdown.Root>
    </XStack>
  )
}

function WriteActions({route}: {route: PublicationRoute}) {
  const draftList = useDraftList()
  const navigateReplace = useNavigate('replace')

  const hasExistingDraft = draftList.data?.documents.some(
    (draft) => draft.id == route.documentId,
  )

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
      let draft = await draftsClient.createDraft({
        existingDocumentId: route.documentId,
        version: route.versionId,
      })
      if (draft.webUrl) {
        // the previous version had a webUrl set.
        // we should check if the user has the site added. if not, set the webUrl to empty
        const sites = await webPublishingClient.listSites({})
        const foundPublishingSite = sites.sites.find(
          (site) => site.hostname === draft.webUrl,
        )
        if (!foundPublishingSite) {
          await draftsClient.updateDraft({
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
