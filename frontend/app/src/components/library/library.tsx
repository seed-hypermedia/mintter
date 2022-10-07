import {useIsEditing, useMain} from '@app/main-context'
import {css} from '@app/stitches.config'
import {Box} from '@components/box'
import {Icon, icons} from '@components/icon'
import {libraryMachine} from '@components/library/library-machine'
import {RecentsSection} from '@components/library/section-recents'
import {Text} from '@components/text'
import {useSelector} from '@xstate/react'
import {InterpreterFrom} from 'xstate'
import {ScrollArea} from '../scroll-area'
import {Separator} from '../separator'
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

export function Library({
  service,
}: {
  service: InterpreterFrom<typeof libraryMachine>
}) {
  const mainService = useMain()
  const isInDraftList = useSelector(mainService, (state) =>
    state.matches('routes.draftList'),
  )
  const isInPubsList = useSelector(mainService, (state) =>
    state.matches('routes.publicationList'),
  )
  const isOpen = useSelector(service, (state) => state.matches('opened'))
  let isEditing = useIsEditing()

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
            paddingTop: '$5',
            transition: 'width 0.15s ease',
            willChange: 'width',
          }}
        >
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
        <Icon color={active ? 'primary-opposite' : 'primary'} name={icon} />
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
