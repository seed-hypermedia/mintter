import {forceSync} from '@app/client/daemon'
import {useIsLibraryOpen} from '@app/main-page-context'
import {css} from '@app/stitches.config'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {DraftsSection} from '@components/library/section-drafts'
import {FilesSection} from '@components/library/section-files'
import {RecentsSection} from '@components/library/section-recents'
import {useCreateDraft} from '@components/library/use-create-draft'
import {PropsWithChildren} from 'react'
import {Box} from '../box'
import {ScrollArea} from '../scroll-area'
import {Separator} from '../separator'
import {BookmarksSection} from './section-bookmarks'
import {ContactsSection} from './section-connections'

let libraryStyle = css({
  transition: 'all 0.25s ease',
  backgroundColor: '$base-background-normal',
  overflow: 'hidden',
  borderLeft: '1px solid $colors$base-border-subtle',
  gridArea: 'library',
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
    <Box {...props} className={libraryStyle()}>
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
            width: isOpen ? '$library-width' : 0,
            paddingTop: '$3',
            position: 'relative',
          }}
        >
          <Box
            css={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              // marginVertical: '$1',
              paddingHorizontal: '$3',
              // marginHorizontal: '-$3',
            }}
          >
            <Button
              variant="ghost"
              size="1"
              color="success"
              onClick={onCreateDraft}
              css={{
                '&:hover': {
                  backgroundColor: '$success-component-bg-normal',
                },
              }}
            >
              New Draft
            </Button>
            <Button variant="ghost" size="1" color="muted" onClick={handleSync}>
              <Icon name="Reload" size="1" />
            </Button>
          </Box>

          <BookmarksSection />
          <RecentsSection />
          <Separator />
          <ContactsSection />
          <Separator />
          <FilesSection />
          <DraftsSection />
        </Box>
      </ScrollArea>
    </Box>
  )
}
