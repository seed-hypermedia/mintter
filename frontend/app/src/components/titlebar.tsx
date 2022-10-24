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

export function TitleBarWindows() {
  return (
    <header id="titlebar" data-tauri-drag-region>
      <div className="titlebar-row" data-tauri-drag-region>
        <div id="titlebar-icon" data-tauri-drag-region>
          icon
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
                    <NavigationMenu.Item className="item">
                      About Mintter
                    </NavigationMenu.Item>
                    <div className="separator"></div>
                    <NavigationMenu.Item className="item">
                      About Mintter
                      <div className="right-slot">⌘,</div>
                    </NavigationMenu.Item>
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
                    <NavigationMenu.Item className="item">
                      New Window
                      <div className="right-slot">⌘N</div>
                    </NavigationMenu.Item>
                    <div className="separator"></div>
                    <NavigationMenu.Item className="item">
                      Close Window
                      <div className="right-slot">⌘W</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Close All Windows
                      <div className="right-slot">⌥⇧⌘W</div>
                    </NavigationMenu.Item>
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
                    <NavigationMenu.Item className="item">
                      Undo
                      <div className="right-slot">⌘Z</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Redo
                      <div className="right-slot">⇧⌘Z</div>
                    </NavigationMenu.Item>
                    <div className="separator"></div>
                    <NavigationMenu.Item className="item">
                      Cut
                      <div className="right-slot">⌘X</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Copy
                      <div className="right-slot">⌘C</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Paste
                      <div className="right-slot">⌘V</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Select All
                      <div className="right-slot">⌘A</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Find...
                      <div className="right-slot">⌘F</div>
                    </NavigationMenu.Item>
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
                    <NavigationMenu.Item className="item">
                      Strong
                      <div className="right-slot">⌘B</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Emphasis
                      <div className="right-slot">⌘I</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Code
                      <div className="right-slot">⌘E</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Underline
                      <div className="right-slot">⌘U</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Strikethrough
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Subscript
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Superscript
                    </NavigationMenu.Item>

                    <div className="separator"></div>

                    <NavigationMenu.Item className="item">
                      Heading
                      <div className="right-slot">⇧⌘H</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Statement
                      <div className="right-slot">⇧⌘S</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Blockquote
                      <div className="right-slot">⇧⌘Q</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Code Block
                      <div className="right-slot">⇧⌘E</div>
                    </NavigationMenu.Item>

                    <div className="separator"></div>

                    <NavigationMenu.Item className="item">
                      Bullet List
                      <div className="right-slot">⇧⌘7</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Numbered List
                      <div className="right-slot">⇧⌘8</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Plain List
                      <div className="right-slot">⇧⌘9</div>
                    </NavigationMenu.Item>
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
                    <NavigationMenu.Item className="item">
                      Reload
                      <div className="right-slot">⌘R</div>
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Quick Switcher...
                      <div className="right-slot">⌘K</div>
                    </NavigationMenu.Item>
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
                    <NavigationMenu.Item className="item">
                      Documentation
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Release Notes
                    </NavigationMenu.Item>
                    <NavigationMenu.Item className="item">
                      Acknowledgements
                    </NavigationMenu.Item>
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
              <Dropdown.Sub>
                <Dropdown.SubTrigger>Edit</Dropdown.SubTrigger>
                <Dropdown.SubContent>
                  <Dropdown.Item>
                    Undo
                    <Dropdown.RightSlot>⌘Z</Dropdown.RightSlot>
                  </Dropdown.Item>
                  <Dropdown.Item>
                    Redo
                    <Dropdown.RightSlot>⇧⌘Z</Dropdown.RightSlot>
                  </Dropdown.Item>
                  <Dropdown.Separator />
                  <Dropdown.Item>
                    Cut
                    <Dropdown.RightSlot>⌘X</Dropdown.RightSlot>
                  </Dropdown.Item>
                  <Dropdown.Item>
                    Copy
                    <Dropdown.RightSlot>⌘C</Dropdown.RightSlot>
                  </Dropdown.Item>
                  <Dropdown.Item>
                    Paste
                    <Dropdown.RightSlot>⌘V</Dropdown.RightSlot>
                  </Dropdown.Item>
                  <Dropdown.Item>
                    Select All
                    <Dropdown.RightSlot>⌘A</Dropdown.RightSlot>
                  </Dropdown.Item>
                  <Dropdown.Item>
                    Find...
                    <Dropdown.RightSlot>⌘F</Dropdown.RightSlot>
                  </Dropdown.Item>
                </Dropdown.SubContent>
              </Dropdown.Sub>

              <Dropdown.Sub>
                <Dropdown.SubTrigger>Format</Dropdown.SubTrigger>
                <Dropdown.SubContent>
                  <Dropdown.Item>
                    Strong
                    <Dropdown.RightSlot>⌘B</Dropdown.RightSlot>
                  </Dropdown.Item>
                  <Dropdown.Item>
                    Emphasis
                    <Dropdown.RightSlot>⌘I</Dropdown.RightSlot>
                  </Dropdown.Item>
                  <Dropdown.Item>
                    Code
                    <Dropdown.RightSlot>⌘E</Dropdown.RightSlot>
                  </Dropdown.Item>
                  <Dropdown.Item>
                    Underline
                    <Dropdown.RightSlot>⌘U</Dropdown.RightSlot>
                  </Dropdown.Item>
                  <Dropdown.Item>Strikethrough</Dropdown.Item>
                  <Dropdown.Item>Subscript</Dropdown.Item>
                  <Dropdown.Item>Superscript</Dropdown.Item>

                  <Dropdown.Separator />

                  <Dropdown.Item>
                    Heading
                    <Dropdown.RightSlot>⇧⌘H</Dropdown.RightSlot>
                  </Dropdown.Item>
                  <Dropdown.Item>
                    Statement
                    <Dropdown.RightSlot>⇧⌘S</Dropdown.RightSlot>
                  </Dropdown.Item>
                  <Dropdown.Item>
                    Blockquote
                    <Dropdown.RightSlot>⇧⌘Q</Dropdown.RightSlot>
                  </Dropdown.Item>
                  <Dropdown.Item>
                    Code Block
                    <Dropdown.RightSlot>⇧⌘E</Dropdown.RightSlot>
                  </Dropdown.Item>

                  <Dropdown.Separator />

                  <Dropdown.Item>
                    Bullet List
                    <Dropdown.RightSlot>⇧⌘7</Dropdown.RightSlot>
                  </Dropdown.Item>
                  <Dropdown.Item>
                    Numbered List
                    <Dropdown.RightSlot>⇧⌘8</Dropdown.RightSlot>
                  </Dropdown.Item>
                  <Dropdown.Item>
                    Plain List
                    <Dropdown.RightSlot>⇧⌘9</Dropdown.RightSlot>
                  </Dropdown.Item>
                </Dropdown.SubContent>
              </Dropdown.Sub>

              <Dropdown.Sub>
                <Dropdown.SubTrigger>View</Dropdown.SubTrigger>
                <Dropdown.SubContent>
                  <Dropdown.Item>
                    Reload
                    <Dropdown.RightSlot>⌘R</Dropdown.RightSlot>
                  </Dropdown.Item>

                  <Dropdown.Item>
                    Quick Switcher
                    <Dropdown.RightSlot>⌘K</Dropdown.RightSlot>
                  </Dropdown.Item>
                </Dropdown.SubContent>
              </Dropdown.Sub>

              <Dropdown.Sub>
                <Dropdown.SubTrigger>Help</Dropdown.SubTrigger>
                <Dropdown.SubContent>
                  <Dropdown.Item>Documentation</Dropdown.Item>
                  <Dropdown.Item>Release Notes</Dropdown.Item>
                  <Dropdown.Item>Acknowledgements</Dropdown.Item>
                </Dropdown.SubContent>
              </Dropdown.Sub>
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

var draggableProps = {
  'data-tauri-drag-region': true,
}

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
//                 <Dropdown.RightSlot>⌘+K</Dropdown.RightSlot>
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
