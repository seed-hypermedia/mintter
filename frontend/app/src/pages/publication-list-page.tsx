import {useFiles} from '@app/main-page-context'
import {pageListStyle} from '@app/pages/list-page'
import {Box} from '@components/box'
import {LibraryItem} from '@components/library/library-item'
import {Text} from '@components/text'

export function PublicationList() {
  let files = useFiles()

  return (
    <Box css={{padding: '$5', paddingBottom: 0, marginBottom: 200}}>
      <Text size="8">Publications</Text>
      <ol className={pageListStyle()}>
        {files.map((publication) => (
          <LibraryItem
            key={publication.version}
            publication={publication}
            href={`/p/${publication.document?.id}/${publication.version}`}
          />
        ))}
      </ol>
    </Box>
  )
}
