import {useFiles} from '@app/main-page-context'
import {LibraryItem} from '@components/library/library-item'
import {ErrorBoundary} from 'react-error-boundary'
import {EmptyList, Section} from './section'
import {SectionError} from './section-error'

export function FilesSection() {
  const files = useFiles()

  return (
    <Section title="All Documents" icon="List">
      {files.length ? (
        <ErrorBoundary
          FallbackComponent={SectionError}
          onReset={() => {
            window.location.reload()
          }}
        >
          {files.map((publication) => {
            let {document, version} = publication
            return (
              <LibraryItem
                key={document?.id}
                href={`/p/${document?.id}/${version}`}
                publication={publication}
              />
            )
          })}
        </ErrorBoundary>
      ) : (
        <EmptyList />
      )}
    </Section>
  )
}
