import {MINTTER_LINK_PREFIX} from '@app/constants'
import {Dropdown} from '@app/editor/dropdown'
import {Find} from '@app/editor/find'
import {MainActor} from '@app/hooks/main-actor'
import {useSiteList} from '@app/hooks/sites'
import {
  PublicationActor,
  PublicationMachineContext,
} from '@app/publication-machine'
import {useNavigation} from '@app/utils/navigation'
import {Icon} from '@components/icon'
import {Tooltip} from '@components/tooltip'
import {emit as tauriEmit} from '@tauri-apps/api/event'
import {useSelector} from '@xstate/react'
import copyTextToClipboard from 'copy-text-to-clipboard'
import toast from 'react-hot-toast'
import {Route, Switch, useLocation} from 'wouter'
import {TitleBarProps} from '.'
import {PublishShareButton} from './publish-share'

export function ActionButtons(props: TitleBarProps) {
  const nav = useNavigation()
  function onCopy() {
    if (props.mainActor?.actor) {
      let context = props.mainActor.actor.getSnapshot().context
      let reference = `${MINTTER_LINK_PREFIX}${context.documentId}/${
        (context as PublicationMachineContext).version
      }`
      copyTextToClipboard(reference)
      toast.success('Document reference copied!')
    }
  }

  return (
    <div
      id="titlebar-action-buttons"
      className="titlebar-section"
      data-tauri-drag-region
    >
      <Find />

      <Switch>
        <Route path="/p/:id/:version/:block?">
          <Tooltip content="Copy document reference">
            <button onClick={onCopy} className="titlebar-button">
              <Icon name="Copy" />
            </button>
          </Tooltip>
        </Route>
      </Switch>

      <Route path="/p/:id/:version/:block?">
        {props.mainActor?.type === 'publication' && (
          <WriteActions publicationActor={props.mainActor.actor} />
        )}
      </Route>

      {props.mainActor ? (
        <PublishShareButton mainActor={props.mainActor} />
      ) : null}

      <div className="button-group">
        <button
          className="titlebar-button"
          onClick={(e) => {
            e.preventDefault()
            nav.openNewDraft(!e.shiftKey)
          }}
        >
          <Icon name="Add" />
          <span style={{marginRight: '0.3em'}}>Write</span>
        </button>
      </div>
    </div>
  )
}

type Push = {
  back: () => void
  forward: () => void
}

export function NavigationButtons({push = history}: {push?: Push}) {
  return (
    <div className="button-group">
      <button
        data-testid="history-back"
        onClick={() => push.back()}
        className="titlebar-button"
      >
        <Icon name="ArrowChevronLeft" size="2" color="muted" />
      </button>
      <button
        data-testid="history-forward"
        onClick={() => push.forward()}
        className="titlebar-button"
      >
        <Icon name="ArrowChevronRight" size="2" color="muted" />
      </button>
    </div>
  )
}

export function SitesNavDropdownItems() {
  const sites = useSiteList()

  let [, setLocation] = useLocation()

  if (!sites.data) return null
  if (sites.data.length == 0) return null
  return (
    <>
      <Dropdown.Separator />
      {sites.data.map((site) => (
        <Dropdown.Item
          key={site.hostname}
          onSelect={() => setLocation(`/sites/${site.hostname}`)}
        >
          <Icon name="Globe" />
          <span>{site.hostname}</span>
        </Dropdown.Item>
      ))}
    </>
  )
}

export function NavMenu({mainActor}: {mainActor?: MainActor}) {
  let [location, setLocation] = useLocation()

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
            disabled={location == '/inbox'}
            data-testid="menu-item-inbox"
            onSelect={() => setLocation('/inbox')}
          >
            <Icon name="File" />
            <span>Inbox</span>
          </Dropdown.Item>
          <Dropdown.Item
            disabled={location == '/drafts'}
            data-testid="menu-item-drafts"
            onSelect={() => setLocation('/drafts')}
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
  let canUpdate = useSelector(
    publicationActor,
    (state) => state.context.canUpdate,
  )

  let errorMessage = useSelector(
    publicationActor,
    (state) => state.context.errorMessage,
  )
  return (
    <>
      {canUpdate && publicationActor && (
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
