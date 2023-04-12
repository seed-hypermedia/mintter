import {useAccount, useDocChanges} from '@app/hooks'
import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {ChangeInfo, formattedDate} from '@mintter/shared'
import {MouseEvent} from 'react'
import {UIAvatar} from '@mintter/ui'
import {Box} from './box'
import {Button} from './button'
import {PanelTitle} from './panel'
import {Text} from './text'

function ChangeItem({
  change,
  docId,
  activeVersion,
  active,
}: {
  change: ChangeInfo
  docId: string
  activeVersion?: string
  active?: boolean
}) {
  const author = useAccount(change.author)
  const navigate = useNavigate()
  const openAccount = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigate({key: 'account', accountId: change.author})
  }
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
        background: active ? '$highlight-surface1' : 'transparent',
        alignItems: 'center',
        position: 'relative',
        '&:hover': {
          cursor: 'pointer',
          background: active ? '$highlight-surface1' : 'transparent',
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
        <Box onClick={openAccount}>
          <UIAvatar
            accountId={change.author}
            alias={author?.data?.profile?.alias || 'A'}
          />
        </Box>

        <Button
          css={{
            color: '$base-text-high',
            padding: '$3',
            '&:hover': {
              textDecoration: 'underline',
              color: '$base-text-high',
            },
          }}
          variant="ghost"
          onClick={openAccount}
        >
          {author?.data?.profile?.alias || change.author}
        </Button>

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

export function ChangesList() {
  const route = useNavRoute()
  const version = route.key === 'publication' ? route.versionId : undefined
  const docId = route.key === 'publication' ? route.documentId : undefined
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
          active={change.version === version}
        />
      ))}
    </>
  )
}
