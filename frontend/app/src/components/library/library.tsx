import { forceSync } from '@app/client/daemon'
import { useIsLibraryOpen } from '@app/main-page-context'
import { css } from '@app/stitches.config'
import { Button } from '@components/button'
import { Icon } from '@components/icon'
import { Box } from '../box'
import { ScrollArea } from '../scroll-area'
import { Separator } from '../separator'
import { BookmarksSection } from './section-bookmarks'
import { ConnectionsSection } from './section-connections'
import { DraftsSection } from './section-drafts'
import { FilesSection } from './section-files'

export function Library() {
  const isOpen = useIsLibraryOpen()

  async function handleSync() {
    await forceSync()
  }


  return (
    <Box className={libraryStyle()} data-testid="library">
      <ScrollArea>

        <Box
          css={{
            width: isOpen ? 232 : 0,
            paddingLeft: isOpen ? '$3' : 0,
            paddingRight: isOpen ? '$3' : 0,
            paddingTop: '$3',
            position: 'relative'
          }}
        >
          <Box css={{
            position: 'absolute',
            right: '$3',
            top: '$3',
            zIndex: '$4'
          }}>
            <Button variant="ghost" size="1" color="muted" onClick={handleSync}>
              <Icon name="Reload" size="1" />
            </Button>
          </Box>
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
  position: 'relative'
})
