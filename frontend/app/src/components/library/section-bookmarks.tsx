import {Button} from '@components/button'
import {useActor} from '@xstate/react'
import {ErrorBoundary} from 'react-error-boundary'
import {Bookmark, bookmarksModel, useBookmarksService} from '../bookmarks'
import {Section} from './section'
import {SectionError} from './section-error'

export function BookmarksSection() {
  const service = useBookmarksService()
  const [state, send] = useActor(service)

  return (
    <Section title="Bookmarks" icon="Star">
      {state.context?.bookmarks?.length ? (
        <ErrorBoundary FallbackComponent={SectionError} onReset={onReset}>
          {state.context.bookmarks.map((bookmark) => (
            <BookmarkItem key={bookmark.link} bookmark={bookmark} />
          ))}
        </ErrorBoundary>
      ) : null}
      <Button
        onClick={() => send(bookmarksModel.events['CLEAR.BOOKMARKS']())}
        variant="ghost"
        color="primary"
        size="1"
        css={{textAlign: 'left'}}
      >
        clear bookmarks
      </Button>
    </Section>
  )
}

function onReset() {
  console.log('implement me: bookmarks onReset')
}

// function BookmarkItem({item}: {item: string}) {
//   const {data, status} = useEmbed(item)

//   if (status == 'loading') {
//     return (
//       <StyledSectionItem>
//         <StyledSectionItemTitle>...</StyledSectionItemTitle>
//       </StyledSectionItem>
//     )
//   }

//   if (status == 'error') {
//     return (
//       <StyledSectionItem>
//         <StyledSectionItemTitle>ERROR</StyledSectionItemTitle>
//       </StyledSectionItem>
//     )
//   }

//   return (
//     <Link
//       href={`/p/${data.document.id}`}
//       onClick={(e) => {
//         console.log('shift?', e.shiftKey)
//       }}
//     >
//       <StyledSectionItem>
//         <StyledSectionItemTitle>{Node.string(data.statement.children[0])}</StyledSectionItemTitle>
//       </StyledSectionItem>
//     </Link>
//   )
// }

function BookmarkItem({bookmark}: {bookmark: Bookmark}) {
  return <p>{bookmark.link}</p>
}
