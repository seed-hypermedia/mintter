import {useDrafts} from '@app/main-page-context'
import {LibraryItem} from '@components/library/library-item'
import {ErrorBoundary} from 'react-error-boundary'
import {Section} from './section'
import {SectionError} from './section-error'

export function DraftsSection() {
  const drafts = useDrafts()

  return (
    <Section title="Drafts" open={true} disabled={status != 'success'}>
      {drafts.length ? (
        <ErrorBoundary
          FallbackComponent={SectionError}
          onReset={() => {
            window.location.reload()
          }}
        >
          {drafts.map((document) => (
            <LibraryItem key={document?.id} href={`/editor/${document?.id}`} draft={document} />
          ))}
        </ErrorBoundary>
      ) : null}
    </Section>
  )
}
