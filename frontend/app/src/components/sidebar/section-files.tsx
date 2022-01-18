import {useFiles} from '@app/main-page-context'
import {PublicationRef} from '@app/main-page-machine'
import {ErrorBoundary} from 'react-error-boundary'
import {Link} from 'wouter'
import {Section} from './section'
import {SectionError} from './section-error'
import {SectionItem} from './section-item'

export function FilesSection() {
  const files = useFiles()
  console.log('🚀 ~ file: section-files.tsx ~ line 11 ~ FilesSection ~ files', files)

  return (
    <Section title="Files" open={true}>
      {files.length ? (
        <ErrorBoundary
          FallbackComponent={SectionError}
          onReset={() => {
            window.location.reload()
          }}
        >
          {files.map((publication: PublicationRef) => {
            let {ref, document, version} = publication

            return (
              <Link key={document?.id} href={`/p/${document?.id}/${version}`}>
                <SectionItem
                  actorRef={ref}
                  key={document?.id}
                  href={`/p/${document?.id}/${version}`}
                  document={document}
                />
              </Link>
            )
          })}
        </ErrorBoundary>
      ) : null}
    </Section>
  )
}
