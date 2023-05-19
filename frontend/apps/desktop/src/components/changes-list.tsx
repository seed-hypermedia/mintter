import {useAccount} from '@app/models/accounts'
import {
  SmartChangeInfo,
  useDocChanges,
  useSmartChanges,
} from '@app/models/changes'
import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {Avatar} from '@components/avatar'
import {ChangeInfo, formattedDate, pluralS} from '@mintter/shared'
import {SizableText} from '@mintter/ui'
import {MouseEvent} from 'react'
import {Box} from './box'
import {Button} from './button'

function ChangeItem({
  change,
  docId,
  activeVersion,
  active,
}: {
  change: SmartChangeInfo
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
          accessory: {
            key: 'versions',
          },
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
          <Avatar
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

        <SizableText size="$2">
          {change.createTime ? formattedDate(change.createTime) : null}
        </SizableText>
      </Box>

      {/* {change.webPubs.map((pub) => (
        <Text size="2" color="muted" key={pub.hostname}>
          PUBLISHED on {pub.hostname}
        </Text>
      ))}
      {change.summary.map((summaryText) => (
        <Text size="2" color="muted" key={summaryText}>
          {summaryText}
        </Text>
      ))} */}

      <SizableText
        // the intention is to indicate which is the active version, but we are comparing a version id with a change id so this doesn't work YET but supposedly will work after *the breaking change*
        size="$1"
        theme={change.id === activeVersion ? 'blue' : 'gray'}
        overflow="hidden"
      >
        {change.id}
      </SizableText>
    </Button>
  )
}

export function ChangesList() {
  const route = useNavRoute()
  const version = route.key === 'publication' ? route.versionId : undefined
  const docId = route.key === 'publication' ? route.documentId : undefined
  const {data} = useSmartChanges(docId)
  if (!docId) return null
  const count = data?.changes?.length || 0
  return (
    <>
      <SizableText size="$5" fontWeight="700">
        {count} Doc {pluralS(count, 'Version')}
      </SizableText>
      {data?.changes?.map((change) => (
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
