import {MINTTER_LINK_PREFIX} from '@app/constants'
import {DraftActor} from '@app/draft-machine'
import {Dropdown} from '@app/editor/dropdown'
import {Find} from '@app/editor/find'
import {useMain} from '@app/main-context'
import {PublicationActor} from '@app/publication-machine'
import {classnames} from '@app/utils/classnames'
import {Icon} from '@components/icon'
import {Tooltip} from '@components/tooltip'
import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import {invoke} from '@tauri-apps/api'
import {emit as tauriEmit} from '@tauri-apps/api/event'
import * as process from '@tauri-apps/api/process'
import {getCurrent} from '@tauri-apps/api/window'
import {useSelector} from '@xstate/react'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {useEffect, useState} from 'react'
import toast from 'react-hot-toast'
import {Route, Switch, useLocation} from 'wouter'
import '../styles/dropdown.scss'
import '../styles/titlebar.scss'

export function TitleBar() {
  return (
    <>
      {import.meta.env.TAURI_PLATFORM == 'macos' && <TitleBarMacos />}
      {import.meta.env.TAURI_PLATFORM == 'windows' && <TitleBarWindows />}
      {import.meta.env.TAURI_PLATFORM == 'linux' && <TitleBarLinux />}
    </>
  )
}

export function TitleBarMacos() {
  return (
    <header id="titlebar" className="titlebar-row" data-tauri-drag-region>
      <div className="titlebar-section">
        <Menu />
        <NavigationButtons />
      </div>

      <Title />

      <ActionButtons />
    </header>
  )
}

interface MenuItemProps {
  title: string
  accelerator?: string
  disabled?: boolean
  onClick: () => void
}

function MenuItem(props: MenuItemProps) {
  useEffect(() => {
    if (props.accelerator) {
      const keys = props.accelerator.split('+')

      window.addEventListener('keyup', (e) => {
        if (
          keys.every((k) => {
            if (k === 'Alt') return e.altKey
            if (k === 'Shift') return e.shiftKey
            if (k === 'Ctrl') return e.ctrlKey
            k === e.key
          })
        ) {
          console.log(`triggered acc ${props.accelerator}!`)
        }
      })
    }
  }, [props.accelerator])

  if (import.meta.env.TAURI_PLATFORM === 'windows') {
    return (
      <NavigationMenu.Item
        className="item"
        onClick={props.onClick}
        data-disabled={props.disabled}
      >
        {props.title}
        {props.accelerator && (
          <div className="right-slot">{props.accelerator}</div>
        )}
      </NavigationMenu.Item>
    )
  } else if (import.meta.env.TAURI_PLATFORM === 'linux') {
    return (
      <Dropdown.Item onClick={props.onClick} disabled={props.disabled}>
        {props.title}
        {props.accelerator && (
          <Dropdown.RightSlot>{props.accelerator}</Dropdown.RightSlot>
        )}
      </Dropdown.Item>
    )
  } else {
    throw new Error('unsupported platform')
  }
}

export function TitleBarWindows() {
  const [location] = useLocation()

  const editingEnabled = location.startsWith('/d/')

  return (
    <header id="titlebar" data-tauri-drag-region>
      <div className="titlebar-row" data-tauri-drag-region>
        <div id="titlebar-icon" data-tauri-drag-region>
          <svg viewBox="0 0 832 960" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M65.5876 639.497C43.1081 639.497 21.1695 641.829 0 646.264V6.80368C21.1685 2.36878 43.1061 0.0255755 65.5876 0C232.669 0.0951212 369.784 128.297 384.062 291.718C302.92 306.721 241.461 377.862 241.461 463.36C241.461 559.765 319.601 637.916 415.992 637.916C512.382 637.916 590.523 559.765 590.523 463.36C590.523 379.964 532.048 310.227 453.867 292.925C467.579 128.86 605.063 9.85009e-05 772.627 9.85009e-05C792.898 0.0231165 812.727 1.93272 831.947 5.56267V644.997C812.726 641.386 792.897 639.496 772.627 639.496C596.333 639.596 452.744 782.56 452.744 958.881L385.289 959.245C385.289 782.653 242.154 639.497 65.5876 639.497Z"
            />
          </svg>
        </div>
        <NavigationMenu.Root id="titlebar-system-menu">
          <NavigationMenu.List className="system-menu">
            <NavigationMenu.Item>
              <NavigationMenu.Trigger className="titlebar-button">
                Mintter
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="content">
                <NavigationMenu.Sub className="dropdown">
                  <NavigationMenu.List className="content">
                    <MenuItem
                      title="About Mintter"
                      onClick={() => invoke('open_about')}
                    />
                    <div className="separator"></div>
                    <MenuItem
                      title="Preferences..."
                      accelerator="Ctrl+,"
                      onClick={() => invoke('open_preferences')}
                    />
                    <div className="separator"></div>
                    <MenuItem
                      title="Hide"
                      accelerator="Ctrl+H"
                      onClick={() => getCurrent().hide()}
                    />
                    <div className="separator"></div>
                    <MenuItem title="Quit" onClick={() => process.exit(0)} />
                  </NavigationMenu.List>
                </NavigationMenu.Sub>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Trigger className="titlebar-button">
                File
              </NavigationMenu.Trigger>
              <NavigationMenu.Content>
                <NavigationMenu.Sub className="dropdown">
                  <NavigationMenu.List className="content">
                    <MenuItem
                      title="New Window"
                      accelerator="Ctrl+N"
                      onClick={() => invoke('new_window')}
                    />
                    <div className="separator"></div>
                    <MenuItem
                      title="Close"
                      accelerator="Ctrl+F4"
                      onClick={() => getCurrent().close()}
                    />
                    <MenuItem
                      title="Close All Windows"
                      accelerator="Ctrl+Shift+Alt+W"
                      onClick={() => invoke('close_all_windows')}
                    />
                  </NavigationMenu.List>
                </NavigationMenu.Sub>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Trigger className="titlebar-button">
                Edit
              </NavigationMenu.Trigger>
              <NavigationMenu.Content>
                <NavigationMenu.Sub className="dropdown">
                  <NavigationMenu.List className="content">
                    <MenuItem
                      title="Undo"
                      accelerator="Ctrl+Z"
                      onClick={() => {}}
                      disabled={!editingEnabled}
                    />
                    <MenuItem
                      title="Redo"
                      accelerator="Ctrl+Shift+Z"
                      onClick={() => {}}
                      disabled={!editingEnabled}
                    />
                    <div className="separator"></div>
                    <MenuItem
                      title="Cut"
                      accelerator="Ctrl+X"
                      onClick={() => {}}
                      disabled={!editingEnabled}
                    />
                    <MenuItem
                      title="Copy"
                      accelerator="Ctrl+C"
                      onClick={() => {}}
                    />
                    <MenuItem
                      title="Paste"
                      accelerator="Ctrl+V"
                      onClick={() => {}}
                      disabled={!editingEnabled}
                    />
                    <MenuItem
                      title="Select All"
                      accelerator="Ctrl+A"
                      onClick={() => tauriEmit('select_all')}
                    />
                    <MenuItem
                      title="Find..."
                      accelerator="Ctrl+F"
                      onClick={() => tauriEmit('open_find')}
                    />
                  </NavigationMenu.List>
                </NavigationMenu.Sub>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Trigger className="titlebar-button">
                Format
              </NavigationMenu.Trigger>
              <NavigationMenu.Content>
                <NavigationMenu.Sub className="dropdown">
                  <NavigationMenu.List className="content">
                    <MenuItem
                      title="Strong"
                      accelerator="Ctrl+B"
                      onClick={() => tauriEmit('format_mark', 'strong')}
                      disabled={!editingEnabled}
                    />
                    <MenuItem
                      title="Emphasis"
                      accelerator="Ctrl+I"
                      onClick={() => tauriEmit('format_mark', 'emphasis')}
                      disabled={!editingEnabled}
                    />
                    <MenuItem
                      title="Code"
                      accelerator="Ctrl+E"
                      onClick={() => tauriEmit('format_mark', 'code')}
                      disabled={!editingEnabled}
                    />
                    <MenuItem
                      title="Underline"
                      accelerator="Ctrl+U"
                      onClick={() => tauriEmit('format_mark', 'underline')}
                      disabled={!editingEnabled}
                    />
                    <MenuItem
                      title="Strikethrough"
                      onClick={() => tauriEmit('format_mark', 'strikethrough')}
                      disabled={!editingEnabled}
                    />
                    <MenuItem
                      title="Subscript"
                      onClick={() => tauriEmit('format_mark', 'subscript')}
                      disabled={!editingEnabled}
                    />
                    <MenuItem
                      title="Superscript"
                      onClick={() => tauriEmit('format_mark', 'superscript')}
                      disabled={!editingEnabled}
                    />

                    <div className="separator"></div>

                    <MenuItem
                      title="Heading"
                      accelerator="Ctrl+Shift+H"
                      onClick={() => tauriEmit('format_block', 'heading')}
                      disabled={!editingEnabled}
                    />
                    <MenuItem
                      title="Statement"
                      accelerator="Ctrl+Shif+S"
                      onClick={() => tauriEmit('format_block', 'statement')}
                      disabled={!editingEnabled}
                    />
                    <MenuItem
                      title="Blockquote"
                      accelerator="Ctrl+Shift+Q"
                      onClick={() => tauriEmit('format_block', 'blockquote')}
                      disabled={!editingEnabled}
                    />
                    <MenuItem
                      title="Code Block"
                      accelerator="Ctrl+Shift+E"
                      onClick={() => tauriEmit('format_block', 'codeblock')}
                      disabled={!editingEnabled}
                    />

                    <div className="separator"></div>

                    <MenuItem
                      title="Bullet List"
                      accelerator="Ctrl+Shift+7"
                      onClick={() => tauriEmit('format_list', 'unordered_list')}
                      disabled={!editingEnabled}
                    />
                    <MenuItem
                      title="Numbered List"
                      accelerator="Ctrl+Shift+8"
                      onClick={() => tauriEmit('format_list', 'ordered_list')}
                      disabled={!editingEnabled}
                    />
                    <MenuItem
                      title="Plain List"
                      accelerator="Ctrl+Shift+9"
                      onClick={() => tauriEmit('format_list', 'group')}
                      disabled={!editingEnabled}
                    />
                  </NavigationMenu.List>
                </NavigationMenu.Sub>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Trigger className="titlebar-button">
                View
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="content">
                <NavigationMenu.Sub className="dropdown">
                  <NavigationMenu.List className="content">
                    <MenuItem
                      title="Reload"
                      accelerator="Ctrl+R"
                      onClick={() => window.location.reload()}
                    />
                    <MenuItem
                      title="Quick Switcher..."
                      accelerator="Ctrl+K"
                      onClick={() => tauriEmit('open_quick_switcher')}
                    />
                  </NavigationMenu.List>
                </NavigationMenu.Sub>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Trigger className="titlebar-button">
                Help
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="content">
                <NavigationMenu.Sub className="dropdown">
                  <NavigationMenu.List className="content">
                    <MenuItem
                      title="Documentation"
                      onClick={() => invoke('open_documentation')}
                    />
                    <MenuItem
                      title="Release Notes"
                      onClick={() => invoke('open_release_notes')}
                    />
                    <MenuItem
                      title="Acknowledgements"
                      onClick={() => invoke('open_acknowledgements')}
                    />
                  </NavigationMenu.List>
                </NavigationMenu.Sub>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
          </NavigationMenu.List>
        </NavigationMenu.Root>

        <Title />

        <div id="titlebar-window-controls">
          <MinimizeButton />
          <MaximizeOrRestoreButton />
          <CloseButton />
        </div>
      </div>

      <div
        className="titlebar-row"
        style={{blockSize: 'var(--topbar-h)'}}
        data-tauri-drag-region
      >
        <div className="titlebar-section">
          <NavigationButtons />
        </div>

        <div data-tauri-drag-region style={{flexGrow: 1}}></div>

        <ActionButtons />
        <Menu />
      </div>
    </header>
  )
}

export function TitleBarLinux() {
  return (
    <header id="titlebar" className="titlebar-row" data-tauri-drag-region>
      <div className="titlebar-section">
        <NavigationButtons />
      </div>

      <Title />

      <ActionButtons />
      <Menu />

      <div className="window-controls">
        <MinimizeButton />
        <MaximizeOrRestoreButton />
        <CloseButton />
      </div>
    </header>
  )
}

function ActionButtons() {
  const mainService = useMain()
  const current = useSelector(mainService, (state) => state.context.current)

  function onCopy() {
    if (current) {
      let context = current.getSnapshot().context
      let reference = `${MINTTER_LINK_PREFIX}${context.documentId}/${context.version}`
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
        <Route path="/d/:id">
          {current && <PublishButton fileRef={current as DraftActor} />}
        </Route>
      </Switch>

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

export function Menu() {
  let [location, setLocation] = useLocation()

  const editingEnabled = location.startsWith('/d/')

  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button data-testid="titlebar-menu" className="titlebar-button">
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

          {import.meta.env.TAURI_PLATFORM == 'linux' && (
            <>
              <Dropdown.Separator />

              <MenuItem
                title="About Mintter"
                onClick={() => invoke('open_about')}
              />

              <MenuItem
                title="Preferences..."
                accelerator="Ctrl+,"
                onClick={() => invoke('open_preferences')}
              />

              <Dropdown.Sub>
                <Dropdown.SubTrigger>View...</Dropdown.SubTrigger>
                <Dropdown.SubContent>
                  <MenuItem
                    title="New Window"
                    accelerator="Ctrl+N"
                    onClick={() => invoke('new_invoke')}
                  />

                  <Dropdown.Separator />

                  <MenuItem
                    title="Close"
                    accelerator="Ctrl+F4"
                    onClick={() => getCurrent().close()}
                  />
                  <MenuItem
                    title="Close All Windows"
                    accelerator="Ctrl+Shift+Alt+W"
                    onClick={() => invoke('close_all_windows')}
                  />
                </Dropdown.SubContent>
              </Dropdown.Sub>
              <Dropdown.Sub>
                <Dropdown.SubTrigger>Edit...</Dropdown.SubTrigger>
                <Dropdown.SubContent>
                  <MenuItem
                    title="Undo"
                    accelerator="Ctrl+Z"
                    onClick={() => {}}
                    disabled={!editingEnabled}
                  />
                  <MenuItem
                    title="Redo"
                    accelerator="Ctrl+Shift+Z"
                    onClick={() => {}}
                    disabled={!editingEnabled}
                  />

                  <Dropdown.Separator />

                  <MenuItem
                    title="Cut"
                    accelerator="Ctrl+X"
                    onClick={() => {}}
                    disabled={!editingEnabled}
                  />
                  <MenuItem
                    title="Copy"
                    accelerator="Ctrl+C"
                    onClick={() => {}}
                  />
                  <MenuItem
                    title="Paste"
                    accelerator="Ctrl+V"
                    onClick={() => {}}
                    disabled={!editingEnabled}
                  />
                  <MenuItem
                    title="Select All"
                    accelerator="Ctrl+A"
                    onClick={() => tauriEmit('select_all')}
                  />
                  <MenuItem
                    title="Find..."
                    accelerator="Ctrl+F"
                    onClick={() => tauriEmit('open_find')}
                  />
                </Dropdown.SubContent>
              </Dropdown.Sub>

              <Dropdown.Sub>
                <Dropdown.SubTrigger>Format...</Dropdown.SubTrigger>
                <Dropdown.SubContent>
                  <MenuItem
                    title="Strong"
                    accelerator="Ctrl+B"
                    onClick={() => tauriEmit('format_mark', 'strong')}
                    disabled={!editingEnabled}
                  />
                  <MenuItem
                    title="Emphasis"
                    accelerator="Ctrl+I"
                    onClick={() => tauriEmit('format_mark', 'emphasis')}
                    disabled={!editingEnabled}
                  />
                  <MenuItem
                    title="Code"
                    accelerator="Ctrl+E"
                    onClick={() => tauriEmit('format_mark', 'code')}
                    disabled={!editingEnabled}
                  />
                  <MenuItem
                    title="Underline"
                    accelerator="Ctrl+U"
                    onClick={() => tauriEmit('format_mark', 'underline')}
                    disabled={!editingEnabled}
                  />
                  <MenuItem
                    title="Strikethrough"
                    onClick={() => tauriEmit('format_mark', 'strikethrough')}
                    disabled={!editingEnabled}
                  />
                  <MenuItem
                    title="Subscript"
                    onClick={() => tauriEmit('format_mark', 'subscript')}
                    disabled={!editingEnabled}
                  />
                  <MenuItem
                    title="Superscript"
                    onClick={() => tauriEmit('format_mark', 'superscript')}
                    disabled={!editingEnabled}
                  />

                  <Dropdown.Separator />

                  <MenuItem
                    title="Heading"
                    accelerator="Ctrl+Shift+H"
                    onClick={() => tauriEmit('format_block', 'heading')}
                    disabled={!editingEnabled}
                  />
                  <MenuItem
                    title="Statement"
                    accelerator="Ctrl+Shif+S"
                    onClick={() => tauriEmit('format_block', 'statement')}
                    disabled={!editingEnabled}
                  />
                  <MenuItem
                    title="Blockquote"
                    accelerator="Ctrl+Shift+Q"
                    onClick={() => tauriEmit('format_block', 'blockquote')}
                    disabled={!editingEnabled}
                  />
                  <MenuItem
                    title="Code Block"
                    accelerator="Ctrl+Shift+E"
                    onClick={() => tauriEmit('format_block', 'codeblock')}
                    disabled={!editingEnabled}
                  />

                  <Dropdown.Separator />

                  <MenuItem
                    title="Bullet List"
                    accelerator="Ctrl+Shift+7"
                    onClick={() => tauriEmit('format_list', 'unordered_list')}
                    disabled={!editingEnabled}
                  />
                  <MenuItem
                    title="Numbered List"
                    accelerator="Ctrl+Shift+8"
                    onClick={() => tauriEmit('format_list', 'ordered_list')}
                    disabled={!editingEnabled}
                  />
                  <MenuItem
                    title="Plain List"
                    accelerator="Ctrl+Shift+9"
                    onClick={() => tauriEmit('format_list', 'group')}
                    disabled={!editingEnabled}
                  />
                </Dropdown.SubContent>
              </Dropdown.Sub>

              <Dropdown.Sub>
                <Dropdown.SubTrigger>View...</Dropdown.SubTrigger>
                <Dropdown.SubContent>
                  <MenuItem
                    title="Reload"
                    accelerator="Ctrl+R"
                    onClick={() => window.location.reload()}
                  />
                  <MenuItem
                    title="Quick Switcher..."
                    accelerator="Ctrl+K"
                    onClick={() => tauriEmit('open_quick_switcher')}
                  />
                </Dropdown.SubContent>
              </Dropdown.Sub>

              <Dropdown.Sub>
                <Dropdown.SubTrigger>Help...</Dropdown.SubTrigger>
                <Dropdown.SubContent>
                  <MenuItem
                    title="Documentation"
                    onClick={() => invoke('open_documentation')}
                  />
                  <MenuItem
                    title="Release Notes"
                    onClick={() => invoke('open_release_notes')}
                  />
                  <MenuItem
                    title="Acknowledgements"
                    onClick={() => invoke('open_acknowledgements')}
                  />
                </Dropdown.SubContent>
              </Dropdown.Sub>

              <Dropdown.Separator />

              <MenuItem title="Quit" onClick={() => process.exit(0)} />
            </>
          )}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  )
}

type Push = {
  back: () => void
  forward: () => void
}

export function NavigationButtons({push = history}: {push?: Push}) {
  return (
    <div className="button-group" id="titlebar-navigation-buttons">
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
        className="titlebar-button "
      >
        <Icon name="ArrowChevronRight" size="2" color="muted" />
      </button>
    </div>
  )
}

function PublishButton({fileRef}: {fileRef: DraftActor}) {
  const isSaving = useSelector(fileRef, (state) =>
    state.matches('editing.saving'),
  )

  return (
    <button
      onClick={() => {
        console.log('PUBLISH!', fileRef)
        fileRef.send('DRAFT.PUBLISH')
      }}
      className="titlebar-button success outlined"
      data-testid="button-publish"
      disabled={isSaving}
    >
      Done
    </button>
  )
}

function Title() {
  const mainService = useMain()
  const current = useSelector(mainService, (state) => state.context.current)

  return (
    <h1 id="titlebar-title" data-testid="titlebar-title" data-tauri-drag-region>
      <Switch>
        <Route path="/inbox">Inbox</Route>
        <Route path="/drafts">Drafts</Route>
        <Route path="/p/:id/:version/:block?">
          {current ? (
            <PublicationTitle fileRef={current as PublicationActor} />
          ) : (
            <>...</>
          )}
        </Route>
        <Route path="/d/:id">
          {current ? <DraftTitle fileRef={current as DraftActor} /> : <>...</>}
        </Route>
      </Switch>
    </h1>
  )
}

function PublicationTitle({fileRef}: {fileRef: PublicationActor}) {
  const title = useSelector(fileRef, (state) => state.context.title)
  const alias = useSelector(
    fileRef,
    (state) => state.context.author?.profile?.alias,
  )

  return (
    <>
      {title}
      <small>{alias}</small>
    </>
  )
}

function DraftTitle({fileRef}: {fileRef: DraftActor}) {
  const title = useSelector(fileRef, (state) => state.context.title)

  return <>{title}</>
}

// function PublicationTopbar() {
//   let

//   function onCopy() {
//     if (current) {
//       let context = current.getSnapshot().context
//       let reference = `${MINTTER_LINK_PREFIX}${context.documentId}/${context.version}`
//       copyTextToClipboard(reference)
//       toast.success('Document reference copied!')
//     }
//   }
//   return (
//     <>
//       <TopbarNavigation />
//       <div className="titlebar-section main" {...draggableProps}>
//         {current ? (
//           <TopbarPublicationData fileRef={current as PublicationActor} />
//         ) : (
//           <span className="topbar-title">...</span>
//         )}
//       </div>
//       <div className="titlebar-section actions" {...draggableProps}>
//         <Find />
//         <Tooltip content="Copy document reference">
//           <button onClick={onCopy} className="topbar-button">
//             <Icon name="Copy" />
//           </button>
//         </Tooltip>
//         <div className="button-group">
//           <button
//             onClick={() => {
//               // create new draft and open a new window
//               mainService.send({type: 'COMMIT.OPEN.WINDOW'})
//             }}
//             className="topbar-button"
//           >
//             <Icon name="Add" />
//             <span style={{marginRight: '0.3em'}}>Write</span>
//           </button>
//           {current && <WriteDropdown fileRef={current as PublicationActor} />}
//         </div>
//       </div>
//     </>
//   )
// }

// function TopbarPublicationData({fileRef}: {fileRef: PublicationActor}) {
//   let title = useSelector(fileRef, (state) => state.context.title)
//   let alias = useSelector(
//     fileRef,
//     (state) => state.context.author?.profile?.alias,
//   )
//   return (
//     <h1 className="topbar-title" data-testid="topbar-title" {...draggableProps}>
//       {title}
//       <small>{alias}</small>
//     </h1>
//   )
// }

// function DraftTopbarWrapper() {
//   /**
//    * we need this component because I can't conditionally call the `isEditing` selector if the service is not available.
//    * ...It sucks I know, but meh!
//    */
//   let mainService = useMain()
//   let current = useSelector(
//     mainService,
//     (state) => state.context.current as DraftActor,
//   )

//   if (!current) return null
//   return <DraftTopbar fileRef={current} mainService={mainService} />
// }

// function DraftTopbar({
//   fileRef,
//   mainService,
// }: {
//   fileRef: DraftActor
//   mainService: MainService
// }) {
//   let isEditing = useSelector(fileRef, (state) => state.context.isEditing)
//   return (
//     <div className="topbar-inner" data-state={isEditing ? 'hidden' : 'visible'}>
//       <TopbarNavigation />
//       <div className="titlebar-section main" {...draggableProps}>
//         <TopbarDraftData fileRef={fileRef} />
//       </div>
//       <div className="titlebar-section actions no-flex" {...draggableProps}>
//         <Find />
//         <PublishButton fileRef={fileRef} />
//         <div className="button-group">
//           <button
//             onClick={() => {
//               // create new draft and open a new window
//               mainService.send({type: 'COMMIT.OPEN.WINDOW'})
//             }}
//             className="topbar-button"
//           >
//             <Icon name="Add" />
//             <span style={{marginRight: '0.3em'}}>Write</span>
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// }

// function TopbarDraftData({fileRef}: {fileRef: DraftActor}) {
//   let title = useSelector(fileRef, (state) => state.context.title)
//   return (
//     <p className="topbar-title" data-testid="topbar-title" {...draggableProps}>
//       {title}
//     </p>
//   )
// }

// function TopbarNavigation() {
//   return (
//     <div className="titlebar-section navigation" {...draggableProps}>
//       <Menu />
//       <HistoryButtons />
//     </div>
//   )
// }

// function WriteDropdown({fileRef}: {fileRef: PublicationActor}) {
//   let mainService = useMain()
//   let isReplying = useIsReplying()
//   let canUpdate = useSelector(fileRef, (state) => state.context.canUpdate)
//   let [, params] = useRoute('/p/:id/:version/:block?')

//   return (
//     <Dropdown.Root>
//       <Dropdown.Trigger asChild>
//         <button className="topbar-button dropdown">
//           <Icon name="CaretDown" />
//         </button>
//       </Dropdown.Trigger>
//       <Dropdown.Portal>
//         <Dropdown.Content>
//           <Dropdown.Item
//             onSelect={() => mainService.send('COMMIT.OPEN.WINDOW')}
//           >
//             <Icon name="File" />
//             <span>New Document</span>
//           </Dropdown.Item>

//           <Dropdown.Item
//             onSelect={() => fileRef.send('PUBLICATION.REPLY')}
//             disabled={isReplying}
//           >
//             <Icon name="MessageBubble" />
//             <span>Reply</span>
//           </Dropdown.Item>

//           {canUpdate ? (
//             <Dropdown.Item
//               onSelect={() => {
//                 fileRef.send({type: 'PUBLICATION.EDIT', params})
//               }}
//             >
//               <Icon name="Pencil" />
//               <span>Edit</span>
//             </Dropdown.Item>
//           ) : null}
//           {/* <TippingModal fileRef={fileRef as PublicationRef} /> */}
//           {/* )} */}

//           <Dropdown.Item
//             onSelect={() => {
//               console.log('IMPLEMENT ME: Review document')
//             }}
//           >
//             <Icon name="PencilAdd" />
//             <span>Review</span>
//           </Dropdown.Item>
//         </Dropdown.Content>
//       </Dropdown.Portal>
//     </Dropdown.Root>
//   )
// }

function CloseButton() {
  const win = getCurrent()
  return (
    <button
      aria-label="close"
      title="Close"
      tabIndex={-1}
      className="window-control close"
      onClick={() => win.close()}
    >
      <svg aria-hidden="true" version="1.1" width="10" height="10">
        <path d="M 0,0 0,0.7 4.3,5 0,9.3 0,10 0.7,10 5,5.7 9.3,10 10,10 10,9.3 5.7,5 10,0.7 10,0 9.3,0 5,4.3 0.7,0 Z" />
      </svg>
    </button>
  )
}

function MaximizeOrRestoreButton() {
  const win = getCurrent()

  const [isMaximized, setIsMaximized] = useState<boolean | undefined>()
  useEffect(() => {
    win.isMaximized().then((v) => setIsMaximized(v))
  })

  if (typeof isMaximized == 'undefined') return null

  let name: string
  let path: string
  let cb

  if (isMaximized) {
    name = 'restore'
    path =
      'm 2,1e-5 0,2 -2,0 0,8 8,0 0,-2 2,0 0,-8 z m 1,1 6,0 0,6 -1,0 0,-5 -5,0 z m -2,2 6,0 0,6 -6,0 z'
    cb = () => {
      win.unmaximize()
      setIsMaximized(false)
    }
  } else {
    name = 'maximize'
    path = 'M 0,0 0,10 10,10 10,0 Z M 1,1 9,1 9,9 1,9 Z'
    cb = () => {
      win.maximize()
      setIsMaximized(true)
    }
  }

  const title = name[0].toUpperCase() + name.substring(1)

  return (
    <button
      aria-label={name}
      title={title}
      tabIndex={-1}
      className={classnames('window-control', name)}
      onClick={cb}
    >
      <svg aria-hidden="true" version="1.1" width="10" height="10">
        <path d={path} />
      </svg>
    </button>
  )
}

function MinimizeButton() {
  const win = getCurrent()

  return (
    <button
      aria-label="minize"
      title="Minimize"
      tabIndex={-1}
      className="window-control minimize"
      onClick={() => win.minimize()}
    >
      <svg aria-hidden="true" version="1.1" width="10" height="10">
        <path d="M 0,5 10,5 10,6 0,6 Z" />
      </svg>
    </button>
  )
}

// function WindowsTitleBar() {
//   return (
//     <div className="topbar-title-bar">
//       <div className="titlebar-section title-menu">
//         <Dropdown.Root>
//           <Dropdown.Trigger asChild>
//             <button className="topbar-button">File</button>
//           </Dropdown.Trigger>
//           <Dropdown.Portal>
//             <Dropdown.Content>
//               <Dropdown.Item>item 1</Dropdown.Item>
//             </Dropdown.Content>
//           </Dropdown.Portal>
//         </Dropdown.Root>
//         <Dropdown.Root>
//           <Dropdown.Trigger asChild>
//             <button className="topbar-button">File</button>
//           </Dropdown.Trigger>
//           <Dropdown.Portal>
//             <Dropdown.Content>
//               <Dropdown.Item>
//                 <span>item 1</span>
//                 <Dropdown.RightSlot>Ctrl++K</Dropdown.RightSlot>
//               </Dropdown.Item>
//             </Dropdown.Content>
//           </Dropdown.Portal>
//         </Dropdown.Root>
//       </div>
//       <div className="titlebar-section actions">
//         <MinimizeButton />
//         <MaximizeOrRestoreButton />
//         <CloseButton />
//       </div>
//     </div>
//   )
// }
