import {SectionItem} from 'frontend/app/src/components/sidebar/section-item'
import {ErrorBoundary} from 'react-error-boundary'
import {Link} from 'wouter'
import {useDraftList} from '../../hooks'
import {Section} from './section'
import {SectionError} from './section-error'

export function DraftsSection() {
  const {data = [], status} = useDraftList()

  return (
    <Section title="Drafts" disabled={status != 'success'}>
      {!!data.length ? (
        <ErrorBoundary
          FallbackComponent={SectionError}
          onReset={() => {
            window.location.reload()
          }}
        >
          {data.map(({document}) => (
            <Link key={document?.id} href={`/editor/${document?.id}`}>
              <SectionItem isDraft href={`/editor/${document?.id}`} document={document} />
            </Link>
          ))}
        </ErrorBoundary>
      ) : null}
    </Section>
  )
}
