import {useIsLibraryOpen} from '@app/main-page-context'
import {css} from '@app/stitches.config'
import {Box} from '../box'
import {ScrollArea} from '../scroll-area'
import {Separator} from '../separator'
import {BookmarksSection} from './section-bookmarks'
import {ConnectionsSection} from './section-connections'
import {DraftsSection} from './section-drafts'
import {FilesSection} from './section-files'

export function Library() {
  const isOpen = useIsLibraryOpen()
  return (
    <Box className={libraryStyle()} data-testid="library">
      <ScrollArea>
        <Box
          css={{
            width: isOpen ? 232 : 0,
            paddingLeft: isOpen ? '$3' : 0,
            paddingRight: isOpen ? '$3' : 0,
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

var libraryStyle = css({
  transition: 'all 0.25s ease',
  backgroundColor: '$background-default',
  gridArea: 'library',
  overflow: 'scroll',
})
