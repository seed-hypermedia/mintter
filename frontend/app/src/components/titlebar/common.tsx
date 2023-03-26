import {MINTTER_LINK_PREFIX} from '@app/constants'
import {Dropdown} from '@app/editor/dropdown'
import {Find} from '@app/editor/find'
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
import {emit as tauriEmit} from '@tauri-apps/api/event'
import {useSelector} from '@xstate/react'
import copyTextToClipboard from 'copy-text-to-clipboard'
import toast from 'react-hot-toast'
import {TitleBarProps} from '.'
import {PublishShareButton} from './publish-share'

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
    <div
      id="titlebar-action-buttons"
      className="titlebar-section"
      data-tauri-drag-region
    >
      <Find />

      {onCopy && (
        <Tooltip content="Copy document reference">
          <button onClick={onCopy} className="titlebar-button">
            <Icon name="Copy" />
          </button>
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
            <button
              disabled={!isDaemonReady}
              className="titlebar-button"
              onClick={(e) => {
                e.preventDefault()
                nav.openNewDraft(!e.shiftKey)
              }}
            >
              <Icon name="Add" />
              <span style={{marginRight: '0.3em'}}>Write</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function NavigationButtons() {
  const dispatch = useNavigationDispatch()
  return (
    <div className="button-group">
      <button
        data-testid="history-back"
        onClick={() => dispatch({type: 'pop'})}
        className="titlebar-button"
      >
        <Icon name="ArrowChevronLeft" size="2" color="muted" />
      </button>
      <button
        data-testid="history-forward"
        onClick={() => dispatch({type: 'forward'})}
        className="titlebar-button"
      >
        <Icon name="ArrowChevronRight" size="2" color="muted" />
      </button>
    </div>
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
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          data-testid="titlebar-menu"
          id="titlebar-menu"
          className="titlebar-button"
        >
          <Icon name="HamburgerMenu" size="2" color="muted" />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content>
          <Dropdown.Item
            disabled={route.key === 'home'}
            data-testid="menu-item-inbox"
            onSelect={() => navigate({key: 'home'})}
          >
            <Icon name="File" />
            <span>Inbox</span>
          </Dropdown.Item>
          <Dropdown.Item
            disabled={route.key === 'drafts'}
            data-testid="menu-item-drafts"
            onSelect={() => navigate({key: 'drafts'})}
          >
            <Icon name="PencilAdd" />
            <span>Drafts</span>
          </Dropdown.Item>
          <SitesNavDropdownItems />
          <Dropdown.Separator />

          <Dropdown.Item onSelect={() => tauriEmit('open_quick_switcher')}>
            Quick Switcher
            <Dropdown.RightSlot>Ctrl+K</Dropdown.RightSlot>
          </Dropdown.Item>
          <Dropdown.Item
            disabled={route.key === 'connections'}
            onSelect={() => navigate({key: 'connections'})}
          >
            Connections
            <Dropdown.RightSlot>Ctrl+9</Dropdown.RightSlot>
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

  let errorMessage = useSelector(
    publicationActor,
    (state) => state.context.errorMessage,
  )
  return (
    <>
      {publicationActor && (
        <div className="button-group">
          <button
            className="titlebar-button"
            onClick={() => {
              publicationActor.send({type: 'PUBLICATION.EDIT'})
            }}
          >
            <span style={{marginInline: '0.3em'}}>Edit</span>
            {errorMessage ? ' (failed)' : null}
          </button>
        </div>
      )}
    </>
  )
}
