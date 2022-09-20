import {forceSync} from '@app/client/daemon'
import {useIsEditing, useLibrary, useMain} from '@app/main-context'
import {css} from '@app/stitches.config'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon, icons} from '@components/icon'
import {libraryMachine} from '@components/library/library-machine'
import {RecentsSection} from '@components/library/section-recents'
import {Text} from '@components/text'
import {Tooltip} from '@components/tooltip'
import {useSelector} from '@xstate/react'
import {ActorRefFrom} from 'xstate'
import {ScrollArea} from '../scroll-area'
import {Separator} from '../separator'
import {BookmarksSection} from './section-bookmarks'
import {ContactsSection} from './section-contacts'

let libraryStyle = css({
  transition: 'all 0.25s ease',
  backgroundColor: '$base-background-normal',
  overflow: 'hidden',
  borderLeft: '1px solid $colors$base-border-subtle',
  position: 'relative',
  height: '$full',

  variants: {
    variant: {
      shell: {
        width: 232,
      },
    },
    visible: {
      false: {
        opacity: 0,
      },
      true: {
        opacity: 1,
      },
    },
  },
})

export function Library() {
  const mainService = useMain()
  const isInDraftList = useSelector(mainService, (state) =>
    state.matches('routes.draftList'),
  )
  const isInPubsList = useSelector(mainService, (state) =>
    state.matches('routes.publicationList'),
  )
  const library = useLibrary()
  const isOpen = useSelector(
    library as ActorRefFrom<typeof libraryMachine>,
    (state) => state.matches('opened'),
  )

  let isEditing = useIsEditing()

  async function handleSync() {
    await forceSync()
  }

  return (
    <Box
      className={libraryStyle({
        visible: !isEditing,
      })}
      data-layout-section="library"
      data-testid="library"
    >
      <ScrollArea>
        <Box
          css={{
            width: isOpen ? '$library-width' : 0,
            position: 'relative',
            paddingHorizontal: isOpen ? '$3' : 0,
            transition: 'width 0.15s ease',
            willChange: 'width',
          }}
        >
          <Box
            css={{
              display: 'flex',
              gap: '$3',
              alignItems: 'center',
              paddingHorizontal: '$3',
              paddingVertical: '$3',
              // borderBottom: '1px solid $colors$base-border-subtle',
            }}
          >
            <Box css={{flex: 1, display: 'flex', gap: '$3'}}>
              <Tooltip content="new Draft">
                <Button
                  variant="ghost"
                  size="0"
                  color="success"
                  onClick={() => mainService.send('CREATE.NEW.DRAFT')}
                  css={{
                    '&:hover': {
                      backgroundColor: '$success-component-bg-normal',
                    },
                  }}
                >
                  <Icon name="AddCircle" size="1" />
                </Button>
              </Tooltip>
              <Tooltip content="new Document">
                <Button
                  variant="ghost"
                  size="0"
                  color="success"
                  onClick={() => mainService.send('COMMIT.OPEN.WINDOW')}
                  css={{
                    '&:hover': {
                      backgroundColor: '$success-component-bg-normal',
                    },
                  }}
                >
                  <Icon name="File" size="1" />
                </Button>
              </Tooltip>
            </Box>
            <Tooltip content="Reload Sync">
              <Button
                variant="ghost"
                size="0"
                color="muted"
                onClick={handleSync}
              >
                <Icon name="Reload" size="1" />
              </Button>
            </Tooltip>
          </Box>

          <LibraryButton
            icon="File"
            onClick={() => mainService.send('GO.TO.PUBLICATIONLIST')}
            title="Files"
            active={isInPubsList}
          />
          <LibraryButton
            icon="PencilAdd"
            onClick={() => mainService.send('GO.TO.DRAFTLIST')}
            title="Drafts"
            active={isInDraftList}
          />
          <Separator />
          <BookmarksSection />
          <RecentsSection />
          <Separator />
          <ContactsSection />
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

export function LibraryShell() {
  return (
    <Box
      data-layout-section="library"
      className={libraryStyle({variant: 'shell'})}
    />
  )
}
