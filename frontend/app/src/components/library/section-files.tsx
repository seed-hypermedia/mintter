import {usePublicationList} from '@app/files-context'
import {LibraryItem} from '@components/library/library-item'
import {ErrorBoundary} from 'react-error-boundary'
import {Section} from './section'
import {SectionError} from './section-error'

export function FilesSection() {
  const pubList = usePublicationList()

  return (
    <Section title="All Documents" icon="List">
      {pubList.length ? (
        <ErrorBoundary
          FallbackComponent={SectionError}
          onReset={() => {
            window.location.reload()
          }}
        >
          {pubList.map((publication) => {
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
      ) : null}
    </Section>
  )
}
