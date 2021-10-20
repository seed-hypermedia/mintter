import {Box} from '@mintter/ui/box'
import {css} from '@mintter/ui/stitches.config'
import {DraftsSection} from 'frontend/app/src/components/sidebar/section-drafts'
import {ScrollArea} from '../scroll-area'
import {Separator} from '../separator'
import {BookmarksSection} from './section-bookmarks'
import {MyPublicationSection} from './section-my-publications'
import {PublicationSection} from './section-publications'

export const SIDEBAR_WIDTH = 232

export function Sidebar() {
  return (
    <Box className={sidebarStyle()}>
      <ScrollArea>
        <Box
          css={{
            width: SIDEBAR_WIDTH,
            paddingHorizontal: '$4',
          }}
        >
          <PublicationSection />
          <MyPublicationSection />
          <DraftsSection />

          <Separator />
          <BookmarksSection />
          <Separator />
        </Box>
      </ScrollArea>
    </Box>
  )
}

var sidebarStyle = css({
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  backgroundColor: '$background-muted',
  width: SIDEBAR_WIDTH,
  paddingTop: 64,
})
