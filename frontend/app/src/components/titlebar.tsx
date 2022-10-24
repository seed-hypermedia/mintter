import {MINTTER_LINK_PREFIX} from '@app/constants'
import {DraftActor} from '@app/draft-machine'
import {Find} from '@app/editor/find'
import {useMain} from '@app/main-context'
import {PublicationActor} from '@app/publication-machine'
import {classnames} from '@app/utils/classnames'
import {Icon} from '@components/icon'
import {Tooltip} from '@components/tooltip'
import {getCurrent} from '@tauri-apps/api/window'
import {useSelector} from '@xstate/react'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {useEffect, useState} from 'react'
import toast from 'react-hot-toast'
import {Route, Switch} from 'wouter'
import '../styles/topbar.scss'

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
    <header>
      {/* traffic lights */}
      <Menu />
      <NavigationButtons />

      <Title />

      <ActionButtons />
    </header>
  )
}

export function TitleBarWindows() {
  return (
    <header>
      {/* icon */}
      {/* system menu */}

      <Title />

      <div className="window-controls">
        <MinimizeButton />
        <MaximizeOrRestoreButton />
        <CloseButton />
      </div>

      <br />

      <NavigationButtons />

      <ActionButtons />
      <Menu />
    </header>
  )
}

export function TitleBarLinux() {
  return (
    <header>
      <NavigationButtons />

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
    <div>
      <Find />

      <Switch>
        <Route path="/p/:id/:version/:block?">
          <Tooltip content="Copy document reference">
            <button onClick={onCopy} className="topbar-button">
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
          className="topbar-button"
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

function Menu() {
  return <div></div>
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
        className="topbar-button"
      >
        <Icon name="ArrowChevronLeft" size="2" color="muted" />
      </button>
      <button
        data-testid="history-forward"
        onClick={() => push.forward()}
        className="topbar-button "
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
      className="topbar-button success outlined"
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
    <h1 className="topbar-title" data-testid="topbar-title">
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
//       <div className="topbar-section main" {...draggableProps}>
//         {current ? (
//           <TopbarPublicationData fileRef={current as PublicationActor} />
//         ) : (
//           <span className="topbar-title">...</span>
//         )}
//       </div>
//       <div className="topbar-section actions" {...draggableProps}>
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
//       <div className="topbar-section main" {...draggableProps}>
//         <TopbarDraftData fileRef={fileRef} />
//       </div>
//       <div className="topbar-section actions no-flex" {...draggableProps}>
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
//     <div className="topbar-section navigation" {...draggableProps}>
//       <Menu />
//       <HistoryButtons />
//     </div>
//   )
// }

// export function Menu({emit = tauriEmit}: {emit?: typeof tauriEmit}) {
//   let [location, setLocation] = useLocation()

//   async function handleSearchSelect() {
//     try {
//       await emit('open_quick_switcher')
//     } catch (err) {
//       console.log(
//         '🚀 ~ file: topbar.tsx ~ line 198 ~ handleSearchSelect ~ err',
//         err,
//       )
//     }
//   }
//   return (
//     <Dropdown.Root>
//       <Dropdown.Trigger asChild>
//         <button data-testid="topbar-menu" className="topbar-button">
//           <Icon name="HamburgerMenu" size="2" color="muted" />
//         </button>
//       </Dropdown.Trigger>
//       <Dropdown.Portal>
//         <Dropdown.Content>
//           <Dropdown.Item
//             disabled={location == '/inbox'}
//             data-testid="menu-item-inbox"
//             onSelect={() => setLocation('/inbox')}
//           >
//             <Icon name="File" />
//             <span>Inbox</span>
//           </Dropdown.Item>
//           <Dropdown.Item
//             disabled={location == '/drafts'}
//             data-testid="menu-item-drafts"
//             onSelect={() => setLocation('/drafts')}
//           >
//             <Icon name="PencilAdd" />
//             <span>Drafts</span>
//           </Dropdown.Item>
//           <Dropdown.Item
//             data-testid="menu-item-search"
//             onSelect={handleSearchSelect}
//           >
//             <Icon name="Search" />
//             <span>Quick Switcher</span>
//             <Dropdown.RightSlot>⌘+K</Dropdown.RightSlot>
//           </Dropdown.Item>
//         </Dropdown.Content>
//       </Dropdown.Portal>
//     </Dropdown.Root>
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
//       <div className="topbar-section title-menu">
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
//       <div className="topbar-section actions">
//         <MinimizeButton />
//         <MaximizeOrRestoreButton />
//         <CloseButton />
//       </div>
//     </div>
//   )
// }
