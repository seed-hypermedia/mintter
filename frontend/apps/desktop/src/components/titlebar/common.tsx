import {MINTTER_LINK_PREFIX} from '@app/constants'
import {Dropdown} from '@app/editor/dropdown'
import {Find} from '@app/editor/find'
import {useDraftList} from '@app/hooks'
import {MainActor} from '@app/hooks/main-actor'
import {useSiteList} from '@app/hooks/sites'
import {useDaemonReady} from '@app/node-status-context'
import {PublicationActor} from '@app/publication-machine'
import {
  useNavigate,
  useNavigationActions,
  useNavigationDispatch,
  useNavRoute,
} from '@app/utils/navigation'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {ContactsPrompt} from '@components/contacts-prompt'
import {Icon} from '@components/icon'
import {Tooltip} from '@components/tooltip'
import {Button, XGroup} from '@mintter/ui'
import {emit as tauriEmit} from '@tauri-apps/api/event'
import {useActor, useSelector} from '@xstate/react'
import copyTextToClipboard from 'copy-text-to-clipboard'
import toast from 'react-hot-toast'
import {TitleBarProps} from '.'
import {PublishShareButton} from './publish-share'
import {TitlebarSection} from './titlebar'

export function ActionButtons(props: TitleBarProps) {
  const nav = useNavigationActions()
  const route = useNavRoute()
  const isDaemonReady = useDaemonReady()

  const onCopy =
    route.key === 'publication'
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
      <Find />

      {onCopy && (
        <Tooltip content="Copy document reference">
          <Button onPress={onCopy}>
            <Icon name="Copy" />
          </Button>
        </Tooltip>
      )}

      {route.key === 'publication' &&
      props.mainActor?.type === 'publication' ? (
        <WriteActions publicationActor={props.mainActor.actor} />
      ) : null}

      {props.mainActor ? (
        <PublishShareButton mainActor={props.mainActor} />
      ) : null}

      {route.key === 'draft' ? null : (
        <div className="button-group">
          {route.key === 'connections' ? (
            <ContactsPrompt />
          ) : (
            <Button
              disabled={!isDaemonReady}
              onPress={(e) => {
                e.preventDefault()
                // @ts-ignore
                nav.openNewDraft(!e.shiftKey)
              }}
            >
              <span style={{marginRight: '0.3em'}}>Write</span>
              <Icon name="Add" />
            </Button>
          )}
        </div>
      )}
    </TitlebarSection>
  )
}

export function NavigationButtons() {
  const dispatch = useNavigationDispatch()
  return (
    <XGroup>
      <XGroup.Item>
        <Button onPress={() => dispatch({type: 'pop'})}>
          <Icon name="ArrowChevronLeft" size="2" color="muted" />
        </Button>
      </XGroup.Item>
      <XGroup.Item>
        <Button onPress={() => dispatch({type: 'forward'})}>
          <Icon name="ArrowChevronRight" size="2" color="muted" />
        </Button>
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
      <Dropdown.Separator />
      {sites.data.map((site) => (
        <Dropdown.Item
          key={site.hostname}
          onSelect={() => navigate({key: 'site', hostname: site.hostname})}
        >
          <Icon name="Globe" />
          <span>{hostnameStripProtocol(site.hostname)}</span>
        </Dropdown.Item>
      ))}
    </>
  )
}

export function NavMenu({mainActor}: {mainActor?: MainActor}) {
  const route = useNavRoute()
  const navigate = useNavigate()
  const spawn = useNavigate('spawn')
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <Button>
          <Icon name="HamburgerMenu" size="2" color="muted" />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content>
          <Dropdown.Item
            disabled={route.key === 'home'}
            data-testid="menu-item-inbox"
            onSelect={() => navigate({key: 'home'})}
          >
            <Icon name="File" />
            <span>All Publications</span>
            <Dropdown.RightSlot>&#8984; 1</Dropdown.RightSlot>
          </Dropdown.Item>
          <Dropdown.Item
            disabled={route.key === 'drafts'}
            data-testid="menu-item-drafts"
            onSelect={() => navigate({key: 'drafts'})}
          >
            <Icon name="PencilAdd" />
            <span>Drafts</span>
            <Dropdown.RightSlot>&#8984; 8</Dropdown.RightSlot>
          </Dropdown.Item>
          <Dropdown.Item
            disabled={route.key === 'connections'}
            onSelect={() => navigate({key: 'connections'})}
          >
            <Icon name="Person" />
            Connections
            <Dropdown.RightSlot>&#8984; 9</Dropdown.RightSlot>
          </Dropdown.Item>
          <SitesNavDropdownItems />
          <Dropdown.Separator />
          <Dropdown.Item onSelect={() => tauriEmit('open_quick_switcher')}>
            <Icon name="QuickSwitcher" />
            Quick Switcher
            <Dropdown.RightSlot>&#8984; K</Dropdown.RightSlot>
          </Dropdown.Item>
          <Dropdown.Item onSelect={() => spawn({key: 'settings'})}>
            <Icon name="GearOutlined" />
            Settings
            <Dropdown.RightSlot>&#8984; ,</Dropdown.RightSlot>
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  )
}

function WriteActions({
  publicationActor,
}: {
  publicationActor: PublicationActor
}) {
  // let canUpdate = useSelector(
  //   publicationActor,
  //   (state) => state.context.canUpdate,
  // )
  const draftList = useDraftList()
  const [pubState] = useActor(publicationActor)
  const hasExistingDraft = draftList.data?.documents.some(
    (draft) => draft.id === pubState.context.documentId,
  )
  let errorMessage = useSelector(
    publicationActor,
    (state) => state.context.errorMessage,
  )
  return (
    <>
      {publicationActor && (
        <div className="button-group">
          <Button
            theme={hasExistingDraft ? 'yellow' : undefined}
            onPress={() => {
              publicationActor.send({type: 'PUBLICATION.EDIT'})
            }}
          >
            {hasExistingDraft ? 'Resume Editing' : 'Edit'}
            {errorMessage ? ' (failed)' : null}
          </Button>
        </div>
      )}
    </>
  )
}
