import {Box} from '@mintter/ui/box'
import {css} from '@mintter/ui/stitches.config'
import {ReactNode} from 'react'
import {Route} from 'wouter'
import {ScrollArea} from '../components/scroll-area'
import {Sidebar, SidebarProvider, SidebarStatus, SIDEBAR_WIDTH, useSidebar} from '../components/sidebar'
import {SidepanelProvider} from '../components/sidepanel'
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
            <ScrollArea>
              <Route path="/p/:docId" component={Publication} />
              <Route path="/editor/:docId">{(params) => <EditorPage params={params} />}</Route>
            </ScrollArea>
          </MainWindow>
        </Box>
      </SidepanelProvider>
    </SidebarProvider>
  )
}

var rootPageStyle = css({
  width: '100vw',
  height: '100vh',
  display: 'flex',
  position: 'relative',
  overflow: 'hidden',
  background: '$background-default',
  //@ts-ignore
})

function MainWindow({children}: {children: ReactNode}) {
  const {status} = useSidebar()

  return (
    <Box
      css={{
        height: '100%',
        width: '100%',
        marginLeft: status == SidebarStatus.Open ? SIDEBAR_WIDTH : 0,
        marginTop: 48,
        transition: 'all 0.25s ease',
        // paddingLeft: '$7',
        // paddingRight: '$4',
        // paddingVertical: '$5',
      }}
    >
      {children}
    </Box>
  )
}
