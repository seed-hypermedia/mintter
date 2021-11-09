import {Box} from '@mintter/ui/box'
import {css} from '@mintter/ui/stitches.config'
import {ScrollArea} from '../scroll-area'
import {Separator} from '../separator'
import {BookmarksSection} from './section-bookmarks'
import {ConnectionsSection} from './section-connections'
import {DraftsSection} from './section-drafts'
import {MyPublicationSection} from './section-my-publications'
import {PublicationSection} from './section-publications'
import {useIsSidebarOpen} from './sidebar-context'

export const SIDEBAR_WIDTH = 232

export function Sidebar() {
  const isOpen = useIsSidebarOpen()
  return (
    <Box className={sidebarStyle()}>
      <ScrollArea>
        <Box
          css={{
            width: isOpen ? 232 : 0,
            paddingHorizontal: isOpen ? '$3' : 0,
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
