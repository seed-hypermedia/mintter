import {Box} from '@mintter/ui/box'
import {css} from '@mintter/ui/stitches.config'
import {ScrollArea} from '../scroll-area'
import {Separator} from '../separator'
import {BookmarksSection} from './section-bookmarks'
import {ConnectionsSection} from './section-connections'
import {DraftsSection} from './section-drafts'
import {MyPublicationSection} from './section-my-publications'
import {PublicationSection} from './section-publications'
import {SidebarStatus, useSidebar} from './sidebar-context'

export const SIDEBAR_WIDTH = 232

export function Sidebar() {
  const {status} = useSidebar()
  return (
    <Box
      className={sidebarStyle()}
      css={{
        transform: status == SidebarStatus.Open ? 'translateX(0px)' : `translate(-${SIDEBAR_WIDTH}px)`,
      }}
    >
      <ScrollArea>
        <Box
          css={{
            width: SIDEBAR_WIDTH,
            paddingHorizontal: '$3',
          }}
        >
          <PublicationSection />
          <MyPublicationSection />
          <DraftsSection />

          <Separator />
          <BookmarksSection />
          <Separator />
          <ConnectionsSection />
        </Box>
      </ScrollArea>
    </Box>
  )
}

var sidebarStyle = css({
  transition: 'all 0.25s ease',
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  backgroundColor: '$background-neutral',
  width: SIDEBAR_WIDTH,
  paddingTop: 64,
})
