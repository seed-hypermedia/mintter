import {Box} from '@mintter/ui/box'
import {css} from '@mintter/ui/stitches.config'
import {Route} from 'wouter'
import {ScrollArea} from '../components/scroll-area'
import {Sidebar, SIDEBAR_WIDTH} from '../components/sidebar'
import {SidepanelProvider} from '../components/sidepanel'
import {Topbar} from '../components/topbar'
import EditorPage from './editor'
import Publication from './publication'

export function MainPage() {
  return (
    <SidepanelProvider>
      <Box className={rootPageStyle()}>
        <Topbar />
        <Sidebar />
        <Box className={mainWindowStyle()}>
          <ScrollArea>
            <Route path="/p/:docId" component={Publication} />
            <Route path="/editor/:docId">{(params) => <EditorPage params={params} />}</Route>
          </ScrollArea>
        </Box>
      </Box>
    </SidepanelProvider>
  )
}

var rootPageStyle = css({
  width: '100vw',
  height: '100vh',
  display: 'flex',
  position: 'relative',
  overflow: 'hidden',
  //@ts-ignore
})

var mainWindowStyle = css({
  height: '100%',
  width: '100%',
  marginLeft: SIDEBAR_WIDTH,
  // marginTop: 64,
  // paddingLeft: '$7',
  // paddingRight: '$4',
  // paddingVertical: '$5',
})
