import {useEmbed} from 'frontend/app/src/editor/embed'
import {ErrorBoundary} from 'react-error-boundary'
import {Node} from 'slate'
import {Link} from 'wouter'
import {useSidepanel} from '../sidepanel'
import {Section} from './section'
import {SectionError} from './section-error'
import {StyledSectionItem, StyledSectionItemTitle} from './section-item'

export function BookmarksSection() {
  const {state} = useSidepanel()
  return (
    <Section title="Bookmarks" icon="Star">
      {!!state.context.bookmarks.length ? (
        <ErrorBoundary FallbackComponent={SectionError} onReset={onReset}>
          {state.context.bookmarks.map((item) => (
            <BookmarkItem key={item} item={item} />
          ))}
        </ErrorBoundary>
      ) : null}
    </Section>
  )
}

function onReset() {
  console.log('implement me: bookmarks onReset')
}

function BookmarkItem({item}: {item: string}) {
  const {data, status} = useEmbed(item)

  if (status == 'loading') {
    return (
      <StyledSectionItem>
        <StyledSectionItemTitle>...</StyledSectionItemTitle>
      </StyledSectionItem>
    )
  }

  if (status == 'error') {
    return (
      <StyledSectionItem>
        <StyledSectionItemTitle>ERROR</StyledSectionItemTitle>
      </StyledSectionItem>
    )
  }

  return (
    <Link
      href={`/p/${data.document.id}`}
      onClick={(e) => {
        console.log('shift?', e.shiftKey)
      }}
    >
      <StyledSectionItem>
        <StyledSectionItemTitle>{Node.string(data.statement.children[0])}</StyledSectionItemTitle>
      </StyledSectionItem>
    </Link>
  )
}
