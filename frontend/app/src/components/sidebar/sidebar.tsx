import {Box} from '@mintter/ui/box'
import {css} from '@mintter/ui/stitches.config'
import {SidebarStatus} from 'frontend/app/src/components/sidebar'
import {ScrollArea} from '../scroll-area'
import {Separator} from '../separator'
import {BookmarksSection} from './section-bookmarks'
import {ConnectionsSection} from './section-connections'
import {DraftsSection} from './section-drafts'
import {MyPublicationSection} from './section-my-publications'
import {PublicationSection} from './section-publications'
import {useSidebar} from './sidebar-context'

export const SIDEBAR_WIDTH = 232

export function Sidebar() {
  const {status} = useSidebar()
  return (
    <Box className={sidebarStyle()}>
      <ScrollArea>
        <Box
          css={{
            width: status == SidebarStatus.Open ? SIDEBAR_WIDTH : 0,
            paddingHorizontal: status == SidebarStatus.Open ? '$3' : 0,
            paddingTop: '$3',
          }}
        >
          <PublicationSection />
          <MyPublicationSection />
          <DraftsSection />
          <Separator />
          <ConnectionsSection />
          <Separator />
          <BookmarksSection />
        </Box>
      </ScrollArea>
    </Box>
  )
}

var sidebarStyle = css({
  transition: 'all 0.25s ease',
  backgroundColor: '$background-neutral',
  gridArea: 'sidebar',
  overflow: 'scroll',
})
