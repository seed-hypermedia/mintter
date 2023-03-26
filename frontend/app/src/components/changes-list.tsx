import {useAuthor, useDocChanges} from '@app/hooks'
import {useNavigate} from '@app/utils/navigation'
import {ChangeInfo, formattedDate} from '@mintter/shared'
import {Avatar} from './avatar'
import {Box} from './box'
import {Button} from './button'
import {PanelTitle} from './panel'
import {Text} from './text'

function ChangeItem({
  change,
  docId,
  activeVersion,
}: {
  change: ChangeInfo
  docId: string
  activeVersion?: string
}) {
  const author = useAuthor(change.author)
  const navigate = useNavigate()
  console.log('VERSION ITEM', change, docId)
  return (
    <Button
      key={change.id}
      as="li"
      variant="ghost"
      onClick={() => {
        navigate({
          key: 'publication',
          documentId: docId,
          versionId: change.version,
        })
      }}
      css={{
        listStyle: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '$3',
        alignItems: 'center',
        position: 'relative',
        '&:hover': {
          cursor: 'pointer',
        },
      }}
    >
      <Box
        css={{
          display: 'flex',
          alignSelf: 'stretch',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        <Avatar
          accountId={change.author}
          size={2}
          alias={author?.data?.profile?.alias || 'A'}
        />

        <Text size="2" fontWeight="bold" css={{marginHorizontal: '$4'}}>
          {author?.data?.profile?.alias || change.author}
        </Text>

        <Text size="2" color="muted">
          {change.createTime ? formattedDate(change.createTime) : null}
        </Text>
      </Box>
      <Text
        size="1"
        color={
          // the intention is to indicate which is the active version, but we are comparing a version id with a change id so this doesn't work YET but supposedly will work after *the breaking change*
          change.id === activeVersion ? 'primary' : 'muted'
        }
        css={{overflow: 'hidden'}}
      >
        {change.id}
      </Text>
    </Button>
  )
}

function pluralS(length: number) {
  return length === 1 ? '' : 's'
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
  const count = changes?.changes?.length || 0
  return (
    <>
      <PanelTitle>
        {count} Doc Version{pluralS(count)}
      </PanelTitle>
      {changes?.changes.map((change) => (
        <ChangeItem
          docId={docId}
          key={change.id}
          change={change}
          activeVersion={version}
        />
      ))}
    </>
  )
}
