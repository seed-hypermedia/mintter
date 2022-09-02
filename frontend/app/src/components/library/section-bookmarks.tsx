import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {BookmarkItem} from '@components/library/bookmark-item'
import {Tooltip} from '@components/tooltip'
import {useActor} from '@xstate/react'
import {ErrorBoundary} from 'react-error-boundary'
import {useBookmarksService} from '../bookmarks'
import {Section} from './section'
import {SectionError} from './section-error'

export function BookmarksSection() {
  const service = useBookmarksService()
  const [state, send] = useActor(service)

  function onReset() {
    send('BOOKMARK.RESET')
  }

  return (
    <Section
      title="Bookmarks"
      icon="Bookmark"
      actions={
        <Box
          css={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Tooltip content="Clear bookmarks">
            <Button
              onClick={() => send('BOOKMARK.CLEARALL')}
              variant="ghost"
              color="primary"
              data-testid="clear-bookmarks"
              size="1"
              css={{
                all: 'unset',
                padding: '$1',
                borderRadius: '$2',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover': {
                  backgroundColor: '$base-component-bg-hover',
                },
              }}
            >
              <Icon name="CloseCircle" color="muted" size="1" />
            </Button>
          </Tooltip>
        </Box>
      }
    >
      {state.context?.bookmarks?.length ? (
        <ErrorBoundary FallbackComponent={SectionError} onReset={onReset}>
          {state.context.bookmarks.map((bookmark) => (
            <BookmarkItem key={bookmark.url} itemRef={bookmark.ref} />
          ))}
        </ErrorBoundary>
      ) : null}
    </Section>
  )
}
