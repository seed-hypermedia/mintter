import {draftsClient} from '@app/api-clients'
import {Dropdown} from '@app/editor/dropdown'
import appError from '@app/errors'
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
} from '@app/utils/navigation'
import {useOpenDraft} from '@app/utils/open-draft'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {Avatar} from '@components/avatar'
import {ContactsPrompt} from '@components/contacts-prompt'
import {Icon} from '@components/icon'
import {Tooltip} from '@components/tooltip'
import {MINTTER_LINK_PREFIX} from '@mintter/shared'
import {
  Add,
  Back,
  Button,
  Copy,
  Draft,
  File,
  Forward,
  Globe,
  Menu,
  Separator,
  Settings,
  SizableText,
  Stack,
  TitlebarSection,
  User,
  XGroup,
  XStack,
  YStack,
} from '@mintter/ui'
import {emit as tauriEmit} from '@tauri-apps/api/event'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {useState} from 'react'
import toast from 'react-hot-toast'
import {TitleBarProps} from '.'
import {PublishShareButton} from './publish-share'

export function ActionButtons(props: TitleBarProps) {
  const openDraft = useOpenDraft()
  const route = useNavRoute()
  const isDaemonReady = useDaemonReady()

  const onCopy =
    route.key == 'publication'
      ? () => {
          let reference = `${MINTTER_LINK_PREFIX}${route.documentId}`
          if (route.versionId) reference += `?v=${route.versionId}`
          if (route.blockId) reference += `#${route.blockId}`
          copyTextToClipboard(reference)
          toast.success('Document reference copied!')
        }
      : undefined

  return (
    <TitlebarSection>
      {onCopy && (
        <Tooltip content="Copy document reference">
          <Button chromeless size="$2" onPress={onCopy} icon={Copy} />

          {/* </Button> */}
        </Tooltip>
      )}

      {route.key == 'publication' ? <WriteActions route={route} /> : null}

      <PublishShareButton />

      {route.key == 'draft' ? null : (
        <div className="button-group">
          {route.key == 'connections' ? (
            <ContactsPrompt />
          ) : (
            <Button
              size="$2"
              chromeless
              disabled={!isDaemonReady}
              iconAfter={Add}
              onPress={(e) => {
                e.preventDefault()
                // @ts-ignore
                openDraft(!e.shiftKey)
              }}
            >
              Write
            </Button>
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
  )
}

export function SitesNavDropdownItems() {
  const sites = useSiteList()
  const navigate = useNavigate()

  if (!sites.data) return null
  if (sites.data.length == 0) return null
  return (
    <>
      <Separator />
      {sites.data.map((site) => (
        <Dropdown.Item
          key={site.hostname}
          onSelect={() => navigate({key: 'site', hostname: site.hostname})}
          asChild
          icon={Globe}
          title={hostnameStripProtocol(site.hostname)}
        />
      ))}
    </>
  )
}

function AccountDropdownItem() {
  const navigate = useNavigate()
  const route = useNavRoute()
  const {data: account} = useMyAccount()
  return (
    <Dropdown.Item
      disabled={route.key == 'account' && route.accountId == account?.id}
      onSelect={() => {
        if (!account?.id) {
          appError('Account has not loaded.')
          return
        }
        navigate({key: 'account', accountId: account?.id})
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

export function NavMenu() {
  const route = useNavRoute()
  const navigate = useNavigate()
  const spawn = useNavigate('spawn')
  return (
    <XStack paddingRight="$2">
      <Dropdown.Root>
        <Dropdown.Trigger icon={Menu} />

        <Dropdown.Portal>
          <Dropdown.Content side="bottom" align="start">
            <AccountDropdownItem />
            <Separator />
            <Dropdown.Item
              disabled={route.key == 'home'}
              data-testid="menu-item-inbox"
              onSelect={() => navigate({key: 'home'})}
              title="All Publications"
              icon={File}
              iconAfter={
                <SizableText size="$1" color="$mint5">
                  &#8984; 1
                </SizableText>
              }
            />
            <Dropdown.Item
              disabled={route.key == 'drafts'}
              data-testid="menu-item-drafts"
              onSelect={() => navigate({key: 'drafts'})}
              icon={Draft}
              title="Drafts"
              iconAfter={
                <SizableText size="$1" color="$mint5">
                  &#8984; 8
                </SizableText>
              }
            />
            <Dropdown.Item
              disabled={route.key == 'connections'}
              onSelect={() => navigate({key: 'connections'})}
              icon={User}
              title="Connections"
              iconAfter={
                <SizableText size="$1" color="$mint5">
                  &#8984; 9
                </SizableText>
              }
            />
            <SitesNavDropdownItems />
            <Separator />
            <Dropdown.Item
              onSelect={() => tauriEmit('open_quick_switcher')}
              title="Quick Switcher"
              iconAfter={
                <SizableText size="$1" color="$mint5">
                  &#8984; K
                </SizableText>
              }
            />

            <Dropdown.Item
              onSelect={() => tauriEmit('open_quick_switcher')}
              icon={Settings}
              title="Quick Settings"
              iconAfter={
                <SizableText size="$1" color="$mint5">
                  &#8984; ,
                </SizableText>
              }
            />
          </Dropdown.Content>
        </Dropdown.Portal>
      </Dropdown.Root>
    </XStack>
  )
}

function WriteActions({route}: {route: PublicationRoute}) {
  const draftList = useDraftList()
  const navigateReplace = useNavigate('replace')
  let [errorMessage, setError] = useState('')

  const hasExistingDraft = draftList.data?.documents.some(
    (draft) => draft.id == route.documentId,
  )

  async function handleEdit() {
    try {
      let draft = await draftsClient.createDraft({
        existingDocumentId: route.documentId,
      })
      navigateReplace({
        key: 'draft',
        draftId: draft.id,
        contextDocumentId: route.documentId,
      })
    } catch (error) {
      setError(JSON.stringify(error))
    }
  }

  return (
    <>
      {route.key == 'publication' && (
        <Button
          chromeless
          size="$2"
          theme={hasExistingDraft ? 'yellow' : undefined}
          onPress={() => handleEdit()}
        >
          {hasExistingDraft ? 'Resume Editing' : 'Edit'}
          {errorMessage ? ' (failed)' : null}
        </Button>
      )}
    </>
  )
}
