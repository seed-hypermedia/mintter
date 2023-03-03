import {useAuthor, useDocChanges} from '@app/hooks'
import {openPublication} from '@app/utils/navigation'
import {ChangeInfo, formattedDate} from '@mintter/shared'
import {Avatar} from './avatar'
import {Box} from './box'
import {Button} from './button'
import {PanelTitle} from './panel'
import {Text} from './text'

function ChangeItem({change, docId}: {change: ChangeInfo; docId: string}) {
  const author = useAuthor(change.author)
  return (
    <Button
      key={change.id}
      as="li"
      variant="ghost"
      onClick={() => {
        openPublication(docId, change.id)
      }}
      css={{
        listStyle: 'none',
        display: 'flex',
        flexDirection: 'row',
        gap: '$3',
        alignItems: 'center',
        position: 'relative',
        '&:hover': {
          cursor: 'default',
        },
      }}
    >
      <Box css={{}}>
        <Avatar
          accountId={change.author}
          size={2}
          alias={author?.data?.profile?.alias || 'A'}
        />
      </Box>
      <Text size="2" fontWeight="bold">
        {author?.data?.profile?.alias || change.author}
      </Text>
      <Text size="2" color="muted">
        {change.createTime ? formattedDate(change.createTime) : null}
      </Text>
      <Text size="1" color="muted" css={{overflow: 'hidden'}}>
        {change.id}
      </Text>
    </Button>
  )
}

export function ChangesList({
  docId,
  version,
}: {
  docId?: string
  version?: string
}) {
  const {data: changes} = useDocChanges(docId)
  if (!docId) return null
  return (
    <>
      <PanelTitle>Version History</PanelTitle>
      {changes?.changes.map((change) => (
        <ChangeItem docId={docId} key={change.id} change={change} />
      ))}
    </>
  )
}
