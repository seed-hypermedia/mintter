import {CitationsProvider, createCitationsMachine} from '@app/editor/citations'
import {HoverProvider} from '@app/editor/hover-context'
import {hoverMachine} from '@app/editor/hover-machine'
import {MainPageProvider} from '@app/main-page-context'
import {createMainPageMachine} from '@app/main-page-machine'
import {css} from '@app/stitches.config'
import {
  BookmarksProvider,
  createBookmarkListMachine,
} from '@components/bookmarks'
import {Box} from '@components/box'
import {Library} from '@components/library'
import {ScrollArea} from '@components/scroll-area'
import {Settings} from '@components/settings'
import {createSidepanelMachine, SidepanelProvider} from '@components/sidepanel'
import {Text} from '@components/text'
import {Topbar} from '@components/topbar'
import {useActor, useInterpret} from '@xstate/react'
import {PropsWithChildren} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {QueryClient, useQueryClient} from 'react-query'
import {DraftList} from './draft-list-page'
import EditorPage from './editor'
import Publication from './publication'
import {PublicationList} from './publication-list-page'

export function MainPage({client: propClient}: {client?: QueryClient}) {
  // eslint-disable-line
  const localClient = useQueryClient()
  const client = propClient ?? localClient
  const sidepanelService = useInterpret(() => createSidepanelMachine(client))
  const bookmarksService = useInterpret(() => createBookmarkListMachine(client))
  const hoverService = useInterpret(() => hoverMachine)
  const citationsService = useInterpret(() => createCitationsMachine(client))
  const mainPageService = useInterpret(() => createMainPageMachine(client))

  const [state] = useActor(mainPageService)

  return (
    <MainPageProvider value={mainPageService}>
      <CitationsProvider value={citationsService}>
        <HoverProvider value={hoverService}>
          <BookmarksProvider value={bookmarksService}>
            <SidepanelProvider value={sidepanelService}>
              {state.matches('routes.settings') ? (
                <Settings />
              ) : (
                <Box className={rootPageStyle()}>
                  {state.hasTag('topbar') ? <Topbar /> : null}
                  {state.hasTag('library') ? <Library /> : null}
                  <MainWindow>
                    <ErrorBoundary
                      FallbackComponent={PageError}
                      onReset={() => {
                        window.location.reload()
                      }}
                    >
                      {state.hasTag('publication') &&
                      !!state.context.params.docId ? (
                        <Publication key={state.context.params.docId} />
                      ) : null}
                      {state.hasTag('draft') ? (
                        <EditorPage key={state.context.params.docId} />
                      ) : null}
                      {state.matches('routes.home') ? <Placeholder /> : null}
                      {state.matches('routes.draftList') ? <DraftList /> : null}
                      {state.matches('routes.publicationList') ? (
                        <PublicationList />
                      ) : null}
                    </ErrorBoundary>
                  </MainWindow>
                  {/* {state.hasTag('sidepanel') ? <Sidepanel /> : null} */}
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
  gridTemplateColumns: '1fr auto auto',
  gap: 0,
  gridTemplateAreas: `"topbar topbar topbar"
  "main sidepanel library"`,
  background: '$base-background-normal',
})

let mainWindowStyle = css({
  gridArea: 'main',
  position: 'relative',
  overflow: 'auto',
  backgroundColor: '$base-background-subtle',
  paddingBottom: 0,
})

function MainWindow({children}: PropsWithChildren<any>) {
  return (
    <Box className={mainWindowStyle()}>
      <ScrollArea>{children}</ScrollArea>
      {/* {children} */}
    </Box>
  )
}

export function MainWindowShell({children, ...props}: PropsWithChildren<any>) {
  return (
    <Box {...props} className={mainWindowStyle()}>
      {children}
    </Box>
  )
}
export function MainPageShell(props: PropsWithChildren<any>) {
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
          backgroundColor: '$base-component-bg-normal',
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
