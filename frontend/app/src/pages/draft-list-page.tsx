import {useDrafts} from '@app/main-page-context'
import {pageListStyle} from '@app/pages/list-page'
import {Box} from '@components/box'
import {LibraryItem} from '@components/library/library-item'
import {Text} from '@components/text'

export function DraftList() {
  let drafts = useDrafts()

  return (
    <Box css={{padding: '$5', paddingBottom: 0, marginBottom: 200}}>
      <Text size="8">Drafts</Text>
      <ol className={pageListStyle()}>
        {drafts.map((draft) => (
          <LibraryItem
            key={draft.id}
            draft={draft}
            href={`/editor/${draft.id}`}
          />
        ))}
      </ol>
    </Box>
  )
}
