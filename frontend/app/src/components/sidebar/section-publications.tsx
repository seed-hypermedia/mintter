import {useState} from 'react'
import {Link} from 'wouter'
import {useOthersPublicationsList} from '../../hooks'
import {useRoute} from '../../utils/use-route'
import {EmptyList, Section} from './section'
import {SectionItem} from './section-item'

export function PublicationSection() {
  const [open, setOpen] = useState(false)
  const {data = [], status} = useOthersPublicationsList({
    enabled: open,
  })

  const {match} = useRoute<{docId: string}>('/p/:docId')

  console.log('PublicationSection', match)

  return (
    <Section title="Publications" open={open} onOpenChange={setOpen} disabled={status != 'success'}>
      {data.length == 0 ? (
        <EmptyList />
      ) : (
        data.map(({document}) => (
          <Link href={`/p/${document?.id}`}>
            <SectionItem key={document?.id} href={`/p/${document?.id}`} document={document} />
          </Link>
        ))
      )}
    </Section>
  )
}
