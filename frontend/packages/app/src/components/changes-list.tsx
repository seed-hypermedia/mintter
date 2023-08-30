import {useAccount} from '@mintter/app/src/models/accounts'
import {SmartChangeInfo, useSmartChanges} from '@mintter/app/src/models/changes'
import {useNavigate, useNavRoute} from '@mintter/app/src/utils/navigation'
import {Avatar} from '@mintter/app/src/components/avatar'
import {formattedDate, pluralS} from '@mintter/shared'
import {Button, SizableText, XStack} from '@mintter/ui'
import {AccessoryContainer} from './accessory-sidebar'

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
  const openAccount = () => {
    navigate({key: 'account', accountId: change.author})
  }
  return (
    <Button
      key={change.id}
      chromeless
      padding={0}
      onPress={() => {
        navigate({
          key: 'publication',
          documentId: docId,
          versionId: change.version,
          accessory: {
            key: 'versions',
          },
        })
      }}
      flexDirection="column"
      gap="$3"
      backgroundColor={active ? '$highlight-surface1' : 'transparent'}
      alignItems="center"
      position="relative"
      hoverStyle={{
        backgroundColor: active ? '$highlight-surface1' : 'transparent',
        cursor: 'pointer',
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
        {/* <Button
          size="$2"
          icon={Copy}
          onPress={() => {
            // copyTextToClipboard('')
            toast.error('Coming soon after breaking change')
          }}
        /> */}
      </XStack>
      <XStack
        alignSelf="stretch"
        alignItems="center"
        justifyContent="flex-start"
      >
        <XStack onPress={openAccount}>
          <Avatar id={change.author} label={author?.data?.profile?.alias} />
        </XStack>

        <Button onPress={openAccount}>
          {author?.data?.profile?.alias || change.author}
        </Button>

        <SizableText size="$2">
          {change.createTime ? formattedDate(change.createTime) : null}
        </SizableText>
      </XStack>

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
