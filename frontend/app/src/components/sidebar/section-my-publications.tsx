import {Link} from 'wouter'
import {useMyPublicationsList} from '../../hooks'
import {EmptyList, Section} from './section'
import {SectionItem} from './section-item'

export function MyPublicationSection() {
  const {data = [], status} = useMyPublicationsList()

  return (
    <Section title="My Publications" disabled={status != 'success'}>
      {data.length == 0 ? (
        <EmptyList />
      ) : (
        data.map(({document}) => (
          <Link key={document?.id} href={`/p/${document?.id}`}>
            <SectionItem href={`/p/${document?.id}`} document={document} />
          </Link>
        ))
      )}
    </Section>
  )
}
