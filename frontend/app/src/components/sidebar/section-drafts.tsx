import {useDrafts} from '@app/main-page-context'
import {ErrorBoundary} from 'react-error-boundary'
import {Link} from 'wouter'
import {Section} from './section'
import {SectionError} from './section-error'
import {SectionItem} from './section-item'

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
            <Link key={document?.id} href={`/editor/${document?.id}`}>
              <SectionItem isDraft href={`/editor/${document?.id}`} document={document} />
            </Link>
          ))}
        </ErrorBoundary>
      ) : null}
    </Section>
  )
}
