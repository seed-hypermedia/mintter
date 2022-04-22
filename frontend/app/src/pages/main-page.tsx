import {createDraft, Document} from '@app/client'
import {CitationsProvider, createCitationsMachine} from '@app/editor/citations'
import {HoverProvider} from '@app/editor/hover-context'
import {hoverMachine} from '@app/editor/hover-machine'
import {MainPageProvider, useLibrary} from '@app/main-page-context'
import {createMainPageMachine} from '@app/main-page-machine'
import {css} from '@app/stitches.config'
import {BookmarksProvider, createBookmarksMachine} from '@components/bookmarks'
import {Box} from '@components/box'
import {Library} from '@components/library'
import {ScrollArea} from '@components/scroll-area'
import {Settings} from '@components/settings'
import {createSidepanelMachine, Sidepanel, SidepanelProvider} from '@components/sidepanel'
import {Text} from '@components/text'
import {Topbar} from '@components/topbar'
import {useActor, useInterpret, useMachine} from '@xstate/react'
import {PropsWithChildren} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {QueryClient, useQueryClient} from 'react-query'
import {Redirect, Route, RouteComponentProps, Switch, useLocation} from 'wouter'
import {assign, createMachine} from 'xstate'
import EditorPage from './editor'
import Publication from './publication'

export function MainPage({client: propClient}: {client?: QueryClient}) {
  // eslint-disable-line
  const [location] = useLocation()
  const localClient = useQueryClient()
  const client = propClient ?? localClient
  const sidepanelService = useInterpret(() => createSidepanelMachine(client))
  const bookmarksService = useInterpret(() => createBookmarksMachine(client))
  const hoverService = useInterpret(() => hoverMachine)
  const citationsService = useInterpret(() => createCitationsMachine(client))
  const mainPageService = useInterpret(() => createMainPageMachine(client), {
    actions: {
      reconcileLibrary: (context) => {
        context.files.send('RECONCILE')
        context.drafts.send('RECONCILE')
      },
    },
  })

  return (
    <MainPageProvider value={mainPageService}>
      <CitationsProvider value={citationsService}>
        <HoverProvider value={hoverService}>
          <BookmarksProvider value={bookmarksService}>
            <SidepanelProvider value={sidepanelService}>
              {location.includes('settings') ? (
                <Settings />
              ) : (
                <Box className={rootPageStyle()}>
                  <Topbar />
                  <Library />
                  <MainWindow>
                    <ErrorBoundary
                      FallbackComponent={PageError}
                      onReset={() => {
                        window.location.reload()
                      }}
                    >
                      <Switch>
                        <Route path="/p/:docId/:version/:blockId?" component={Publication} />
                        <Route path="/editor/:docId" component={EditorPage} />
                        <Route path="/new/:type?/:docId?/:version?/:blockId?" component={NewWindow} />
                        <Route component={Placeholder} />
                      </Switch>
                    </ErrorBoundary>
                  </MainWindow>
                  <Sidepanel />
                </Box>
              )}
            </SidepanelProvider>
          </BookmarksProvider>
        </HoverProvider>
      </CitationsProvider>
    </MainPageProvider>
  )
}

export var rootPageStyle = css({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100vw',
  height: '100vh',
  display: 'grid',
  overflow: 'hidden',
  gridAutoFlow: 'column',
  gridAutoColumns: '1fr',
  gridTemplateRows: '40px 1fr',
  gridTemplateColumns: 'auto 1fr auto',
  gap: 0,
  gridTemplateAreas: `"topbar topbar topbar"
  "library main sidepanel"`,
  background: '$background-default',
})

let mainWindowStyle = css({
  gridArea: 'main',
  position: 'relative',
  overflow: 'auto',
  backgroundColor: '$background-alt',
})

function MainWindow({children}: PropsWithChildren<{}>) {
  return (
    <Box className={mainWindowStyle()}>
      <ScrollArea>{children}</ScrollArea>
      {/* {children} */}
    </Box>
  )
}

export function MainWindowShell({children, ...props}: PropsWithChildren<{}>) {
  return (
    <Box {...props} className={mainWindowStyle()}>
      {children}
    </Box>
  )
}
export function MainPageShell(props: PropsWithChildren<{}>) {
  return <Box {...props} className={rootPageStyle()} />
}

function Placeholder() {
  return (
    <Box
      aria-hidden
      css={{
        width: '$full',
        height: '$full',
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <Text
        alt
        fontWeight="bold"
        css={{
          // userSelect: 'none',
          WebkitUserSelect: 'none',
          fontSize: 100,
          opacity: 0.5,
          color: 'transparent',
          textShadow: '2px 2px 3px rgba(255,255,255,0.5)',
          backgroundClip: 'text',
          backgroundColor: '$background-neutral-strong',
        }}
      >
        Mintter
      </Text>
    </Box>
  )
}

function PageError({error, resetErrorBoundary}: FallbackProps) {
  return (
    <div role="alert">
      <p>Publication Error</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>reload page</button>
    </div>
  )
}

type NewWindowEvent = {
  type: 'REDIRECT'
  document: Document
}

let newWindowMachine = createMachine({
  tsTypes: {} as import('./main-page.typegen').Typegen0,
  schema: {
    context: {} as {url: string},
    events: {} as NewWindowEvent,
  },
  initial: 'idle',
  context: () => ({
    url: '',
  }),
  entry: ['closeLibrary'],
  states: {
    idle: {
      after: {
        1: [
          {
            cond: 'shouldCreateNewDraft',
            target: 'newDraft',
          },
          {
            target: 'redirect',
            actions: ['assignUrl'],
          },
        ],
      },
    },
    newDraft: {
      invoke: {
        src: 'createNewDraft',
      },
      on: {
        REDIRECT: {
          target: 'redirect',
          actions: 'assignDraftUrl',
        },
      },
    },
    redirect: {},
  },
})

type NewWindowProps = RouteComponentProps<{
  type?: 'p' | 'editor'
  docId?: string
  version?: string
  blockId?: string
}>

function NewWindow({params}: NewWindowProps) {
  const libService = useLibrary()
  const [, libSend] = useActor(libService)
  const [, setLocation] = useLocation()
  const [state] = useMachine(newWindowMachine, {
    services: {
      createNewDraft: () => (sendBack) => {
        try {
          createDraft().then((document) => {
            sendBack({type: 'REDIRECT', document})
          })
        } catch {
          throw new Error('error creating new draft in new window')
        }
      },
    },
    actions: {
      closeLibrary: () => {
        setTimeout(() => {
          libSend('LIBRARY.CLOSE')
        }, 0)
      },
      assignUrl: assign({
        url: () =>
          `/${params.type}/${params.docId}${
            params.version ? `/${params.version}${params.blockId ? `/${params.blockId}` : ''}` : ''
          }`,
      }),
      assignDraftUrl: assign({
        url: (_, event) => `/editor/${event.document.id}`,
      }),
    },
    guards: {
      shouldCreateNewDraft: () => {
        console.log('params', params, typeof params.type == 'undefined')
        return typeof params.type == 'undefined'
      },
    },
  })

  if (state.matches('redirect')) {
    return <Redirect to={state.context.url} />
  }

  return null
}
