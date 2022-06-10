import {forceSync} from '@app/client/daemon'
import {useIsLibraryOpen, useMainPage} from '@app/main-page-context'
import {css} from '@app/stitches.config'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon, icons} from '@components/icon'
import {RecentsSection} from '@components/library/section-recents'
import {Text} from '@components/text'
import {useActor} from '@xstate/react'
import {PropsWithChildren} from 'react'
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

export function LibraryShell({children, ...props}: PropsWithChildren<any>) {
  return (
    <Box {...props} className={libraryStyle()}>
      {children}
    </Box>
  )
}

export function Library() {
  const isOpen = useIsLibraryOpen()
  var service = useMainPage()
  var [mainPageState] = useActor(service)

  async function handleSync() {
    await forceSync()
  }

  return (
    <Box className={libraryStyle()} data-testid="library">
      <ScrollArea>
        <Box
          css={{
            width: isOpen ? '$library-width' : 0,
            paddingTop: '$3',
            position: 'relative',
            paddingHorizontal: isOpen ? '$3' : 0,
          }}
        >
          <Box
            css={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: '$3',
              marginBottom: '$5',
            }}
          >
            <Button
              variant="ghost"
              size="1"
              color="success"
              onClick={() => service.send('COMMIT.NEW.DRAFT')}
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
          <LibraryButton
            icon="File"
            onClick={() => service.send('GO.TO.PUBLICATIONLIST')}
            title="Files"
            active={mainPageState.matches('routes.publicationList')}
          />
          <LibraryButton
            icon="PencilAdd"
            onClick={() => service.send('GO.TO.DRAFTLIST')}
            title="Drafts"
            active={mainPageState.matches('routes.draftList')}
          />
        </Box>
      </ScrollArea>
    </Box>
  )
}

type LibraryButtonProps = {
  title: string
  icon?: keyof typeof icons
  onClick: React.MouseEventHandler<HTMLDivElement>
  active: boolean
}

function LibraryButton({title, icon, onClick, active}: LibraryButtonProps) {
  return (
    <Box
      onClick={onClick}
      css={{
        display: 'flex',
        gap: '$3',
        alignItems: 'center',
        paddingHorizontal: '$3',
        paddingVertical: '$2',
        borderRadius: '$2',
        backgroundColor: active ? '$primary-normal' : 'transparent',

        '&:hover': {
          backgroundColor: active
            ? '$primary-active'
            : '$base-component-bg-normal',
          cursor: 'pointer',
        },
      }}
    >
      {icon && (
        <Icon
          color={active ? 'primary-opposite' : 'primary'}
          name={icon}
          size="1"
        />
      )}
      <Text
        size="2"
        fontWeight="medium"
        color={active ? 'primary-opposite' : 'base-hight'}
      >
        {title}
      </Text>
    </Box>
  )
}
