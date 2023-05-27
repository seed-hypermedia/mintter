import {useAccount} from '@app/models/accounts'
import {SmartChangeInfo, useSmartChanges} from '@app/models/changes'
import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {Avatar} from '@components/avatar'
import {formattedDate, pluralS} from '@mintter/shared'
import {Button, Copy, SizableText, XStack} from '@mintter/ui'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {MouseEvent} from 'react'
import {toast} from 'react-hot-toast'
import {AccessoryContainer} from './accessory-sidebar'
import {Box} from './box'

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
      <XStack
        backgroundColor="$backgroundStrong"
        borderRadius="$2"
        elevation="$3"
        position="absolute"
        right="0"
        top="0"
      >
        <Button
          size="$2"
          icon={Copy}
          onPress={() => {
            // copyTextToClipboard('')
            toast.error('Coming soon after breaking change')
          }}
        />
      </XStack>
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
    </Button>
  )
}

export function VersionsAccessory() {
  const route = useNavRoute()
  const version = route.key === 'publication' ? route.versionId : undefined
  const docId = route.key === 'publication' ? route.documentId : undefined
  const {data} = useSmartChanges(docId)
  if (!docId) return null
  const count = data?.changes?.length || 0
  return (
    <AccessoryContainer title={`${count} Doc ${pluralS(count, 'Version')}`}>
      {data?.changes?.map((change) => (
        <ChangeItem
          docId={docId}
          key={change.id}
          change={change}
          activeVersion={version}
          active={change.version === version}
        />
      ))}
    </AccessoryContainer>
  )
}
