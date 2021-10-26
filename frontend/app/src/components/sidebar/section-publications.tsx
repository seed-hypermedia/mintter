import {useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Link} from 'wouter'
import {useOthersPublicationsList} from '../../hooks'
import {Section} from './section'
import {SectionError} from './section-error'
import {SectionItem} from './section-item'

export function PublicationSection() {
  const [open, setOpen] = useState(false)
  const {data = [], status} = useOthersPublicationsList({
    enabled: open,
  })

  return (
    <Section title="Publications" open={open} onOpenChange={setOpen} disabled={status != 'success'}>
      {!!data.length ? (
        <ErrorBoundary
          FallbackComponent={SectionError}
          onReset={() => {
            window.location.reload()
          }}
        >
          {data.map(({document}) => (
            <Link href={`/p/${document?.id}`}>
              <SectionItem key={document?.id} href={`/p/${document?.id}`} document={document} />
            </Link>
          ))}
        </ErrorBoundary>
      ) : null}
    </Section>
  )
}
