import {useState} from 'react'
import {Link} from 'wouter'
import {useOthersPublicationsList} from '../../hooks'
import {Section} from './section'
import {SectionItem} from './section-item'

export function PublicationSection() {
  const [open, setOpen] = useState(false)
  const {data = [], status} = useOthersPublicationsList({
    enabled: open,
  })

  return (
    <Section title="Publications" open={open} onOpenChange={setOpen} disabled={status != 'success'}>
      {!!data.length
        ? data.map(({document}) => (
            <Link href={`/p/${document?.id}`}>
              <SectionItem key={document?.id} href={`/p/${document?.id}`} document={document} />
            </Link>
          ))
        : null}
    </Section>
  )
}
