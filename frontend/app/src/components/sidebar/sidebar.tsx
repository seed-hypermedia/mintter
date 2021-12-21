import {Box} from '@mintter/ui/box'
import {css} from '@mintter/ui/stitches.config'
import {useIsSidebarOpen} from '../../main-page-context'
import {ScrollArea} from '../scroll-area'
import {Separator} from '../separator'
import {BookmarksSection} from './section-bookmarks'
import {ConnectionsSection} from './section-connections'
import {DraftsSection} from './section-drafts'
import {FilesSection} from './section-files'

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
          <FilesSection />
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
  backgroundColor: '$background-default',
  gridArea: 'sidebar',
  overflow: 'scroll',
})
