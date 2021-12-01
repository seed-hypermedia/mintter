import {Box} from '@mintter/ui/box'
import {css} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {useInterpret} from '@xstate/react'
import {ReactNode} from 'react'
import {Store} from 'tauri-plugin-store-api'
import {Route} from 'wouter'
import {BookmarksProvider, createBookmarksMachine} from '../components/bookmarks'
import {ScrollArea} from '../components/scroll-area'
import {Sidebar, SidebarProvider} from '../components/sidebar'
import {sidebarMachine} from '../components/sidebar/sidebar-machine'
import {Sidepanel, sidepanelMachine, SidepanelProvider} from '../components/sidepanel'
import {Topbar} from '../components/topbar'
import {HoverProvider} from '../editor/hover-context'
import {hoverMachine} from '../editor/hover-machine'
import EditorPage from './editor'
import Publication from './publication'

const store = new Store('.app.dat')

export function MainPage() {
  const sidepanelService = useInterpret(sidepanelMachine)
  const sidebarService = useInterpret(sidebarMachine)
  const bookmarksService = useInterpret(createBookmarksMachine(store))
  const hoverService = useInterpret(hoverMachine)
  return (
    <HoverProvider value={hoverService}>
      <BookmarksProvider value={bookmarksService}>
        <SidebarProvider value={sidebarService}>
          <SidepanelProvider value={sidepanelService}>
            <Box className={rootPageStyle()}>
              <Topbar />
              <Sidebar />
              <MainWindow>
                <Route path="/p/:docId/:blockId?" component={Publication} />
                <Route path="/editor/:docId" component={EditorPage} />
                <Route path="/" component={Placeholder} />
              </MainWindow>
              <Sidepanel />
            </Box>
          </SidepanelProvider>
        </SidebarProvider>
      </BookmarksProvider>
    </HoverProvider>
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
