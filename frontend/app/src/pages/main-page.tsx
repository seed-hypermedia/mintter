import {Box} from '@mintter/ui/box'
import {css} from '@mintter/ui/stitches.config'
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
            <Route path="/p/:docId" component={Publication} />
            <Route path="/editor/:docId" component={EditorPage} />
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
