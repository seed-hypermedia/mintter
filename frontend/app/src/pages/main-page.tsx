import {Box} from '@mintter/ui/box'
import {css} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {useInterpret} from '@xstate/react'
import {ReactNode} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {Route} from 'wouter'
import {bookmarksMachine, BookmarksProvider} from '../components/bookmarks'
import {ScrollArea} from '../components/scroll-area'
import {Sidebar} from '../components/sidebar'
import {Sidepanel, sidepanelMachine, SidepanelProvider} from '../components/sidepanel'
import {Topbar} from '../components/topbar'
import {HoverProvider} from '../editor/hover-context'
import {hoverMachine} from '../editor/hover-machine'
import {MainPageProvider} from '../main-page-context'
import {mainPageMachine} from '../main-page-machine'
import EditorPage from './editor'
import Publication from './publication'

export function MainPage() {
  const sidepanelService = useInterpret(sidepanelMachine)
  const bookmarksService = useInterpret(bookmarksMachine)
  const hoverService = useInterpret(hoverMachine)
  const mainPageService = useInterpret(mainPageMachine, {devTools: true})

  return (
    <MainPageProvider value={mainPageService}>
      <HoverProvider value={hoverService}>
        <BookmarksProvider value={bookmarksService}>
          <SidepanelProvider value={sidepanelService}>
            <Box className={rootPageStyle()}>
              <Topbar />
              <Sidebar />
              <MainWindow>
                <ErrorBoundary
                  FallbackComponent={PageError}
                  onReset={() => {
                    window.location.reload()
                  }}
                >
                  <Route path="/p/:docId/:blockId?" component={Publication} />
                  <Route path="/editor/:docId" component={EditorPage} />
                  <Route path="/" component={Placeholder} />
                </ErrorBoundary>
              </MainWindow>
              <Sidepanel />
            </Box>
          </SidepanelProvider>
        </BookmarksProvider>
      </HoverProvider>
    </MainPageProvider>
  )
}

var rootPageStyle = css({
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
  gridTemplateRows: '48px 1fr',
  gridTemplateColumns: 'auto 1fr auto',
  gap: 0,
  gridTemplateAreas: `"topbar topbar topbar"
  "sidebar main sidepanel"`,
  background: '$background-default',
})

function MainWindow({children}: {children: ReactNode}) {
  return (
    <Box
      css={{
        gridArea: 'main',
        overflow: 'scroll',
        backgroundColor: '$background-alt',
      }}
    >
      <ScrollArea>{children}</ScrollArea>
    </Box>
  )
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
          userSelect: 'none',
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
