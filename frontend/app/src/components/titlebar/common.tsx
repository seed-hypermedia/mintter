import {MINTTER_LINK_PREFIX} from '@app/constants'
import {Dropdown} from '@app/editor/dropdown'
import {Find} from '@app/editor/find'
import {useSiteList} from '@app/hooks/sites'
import {useMain} from '@app/main-context'
import {
  PublicationActor,
  PublicationMachineContext,
} from '@app/publication-machine'
import {Icon} from '@components/icon'
import {Tooltip} from '@components/tooltip'
import {emit as tauriEmit} from '@tauri-apps/api/event'
import {useSelector} from '@xstate/react'
import copyTextToClipboard from 'copy-text-to-clipboard'
import toast from 'react-hot-toast'
import {Route, Switch, useLocation, useRoute} from 'wouter'
import {PublishShareButton} from './publish-share'

export function ActionButtons() {
  const mainService = useMain()
  const current = useSelector(mainService, (state) => state.context.current)

  function onCopy() {
    if (current) {
      let context = current.getSnapshot().context
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
        {/* {current && <WriteDropdown fileRef={current as PublicationActor} />} */}
        {current && <WriteActions fileRef={current as PublicationActor} />}
      </Route>

      <PublishShareButton />

      <div className="button-group">
        <button
          className="titlebar-button"
          onClick={() => {
            // create new draft and open a new window
            mainService.send({type: 'COMMIT.OPEN.WINDOW'})
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

export function NavMenu() {
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

function WriteDropdown({fileRef}: {fileRef: PublicationActor}) {
  let mainService = useMain()
  let canUpdate = useSelector(fileRef, (state) => state.context.canUpdate)
  let [, params] = useRoute('/p/:id/:version/:block?')

  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button className="titlebar-button dropdown">
          <Icon name="CaretDown" />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content>
          <Dropdown.Item
            onSelect={() => mainService.send('COMMIT.OPEN.WINDOW')}
          >
            <Icon name="File" />
            <span>New Document</span>
          </Dropdown.Item>

          {canUpdate ? (
            <Dropdown.Item
              onSelect={() => {
                fileRef.send({type: 'PUBLICATION.EDIT', params})
              }}
            >
              <Icon name="Pencil" />
              <span>Edit</span>
            </Dropdown.Item>
          ) : null}
          {/* <TippingModal fileRef={fileRef as PublicationRef} /> */}
          {/* )} */}

          <Dropdown.Item
            onSelect={() => {
              console.log('IMPLEMENT ME: Review document')
            }}
          >
            <Icon name="PencilAdd" />
            <span>Review</span>
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  )
}

function WriteActions({fileRef}: {fileRef: PublicationActor}) {
  let canUpdate = useSelector(fileRef, (state) => state.context.canUpdate)
  let errorMessage = useSelector(fileRef, (state) => state.context.errorMessage)
  let [, params] = useRoute('/p/:id/:version/:block?')
  return (
    <>
      {canUpdate && fileRef && (
        <div className="button-group">
          <button
            className="titlebar-button"
            onClick={() => {
              fileRef.send({type: 'PUBLICATION.EDIT', params})
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
