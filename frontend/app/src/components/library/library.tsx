import {forceSync} from '@app/client/daemon'
import {useIsLibraryOpen} from '@app/main-page-context'
import {css} from '@app/stitches.config'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {useCreateDraft} from '@components/library/use-create-draft'
import {PropsWithChildren} from 'react'
import {Box} from '../box'
import {ScrollArea} from '../scroll-area'
import {Separator} from '../separator'
import {BookmarksSection} from './section-bookmarks'
import {ConnectionsSection} from './section-connections'
import {DraftsSection} from './section-drafts'
import {FilesSection} from './section-files'

let libraryStyle = css({
  transition: 'all 0.25s ease',
  backgroundColor: '$background-default',
  gridArea: 'library',
  overflow: 'scroll',
  position: 'relative',
  height: '$full',
  variants: {
    variant: {
      shell: {
        width: 232,
      },
    },
  },
})

export function LibraryShell({children, ...props}: PropsWithChildren<{}>) {
  return (
    <Box {...props} className={libraryStyle({variant: 'shell'})}>
      {children}
    </Box>
  )
}

export function Library() {
  const isOpen = useIsLibraryOpen()
  const {createDraft} = useCreateDraft()

  async function handleSync() {
    await forceSync()
  }

  function onCreateDraft() {
    createDraft()
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
            position: 'relative',
          }}
        >
          <Box
            css={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: '$3',
            }}
          >
            <Button variant="ghost" size="1" color="muted" onClick={onCreateDraft}>
              create a new Draft
            </Button>
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
