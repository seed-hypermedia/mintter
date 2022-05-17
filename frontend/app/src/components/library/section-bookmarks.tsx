import {Button} from '@components/button'
import {BookmarkItem} from '@components/library/bookmark-item'
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
    <Section title="Bookmarks" icon="Star">
      {state.context?.bookmarks?.length ? (
        <>
          <ErrorBoundary FallbackComponent={SectionError} onReset={onReset}>
            {state.context.bookmarks.map((bookmark) => (
              <BookmarkItem key={bookmark.url} itemRef={bookmark.ref} />
            ))}
          </ErrorBoundary>
          <Button
            onClick={() => send('BOOKMARK.CLEARALL')}
            variant="ghost"
            color="primary"
            data-testid="clear-bookmarks"
            size="1"
            css={{textAlign: 'left'}}
          >
            clear bookmarks
          </Button>
        </>
      ) : null}
    </Section>
  )
}
