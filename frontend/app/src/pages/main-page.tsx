import {Box} from '@mintter/ui/box'
import {css} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {ReactNode} from 'react'
import {Route} from 'wouter'
import {ScrollArea} from '../components/scroll-area'
import {Sidebar, SidebarProvider} from '../components/sidebar'
import {Sidepanel, SidepanelProvider} from '../components/sidepanel'
import {Topbar} from '../components/topbar'
import EditorPage from './editor'
import Publication from './publication'

export function MainPage() {
  return (
    <SidebarProvider>
      <SidepanelProvider>
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
