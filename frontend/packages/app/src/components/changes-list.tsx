import {Avatar} from '@mintter/app/src/components/avatar'
import {useAccount} from '@mintter/app/src/models/accounts'
import {SmartChangeInfo, useSmartChanges} from '@mintter/app/src/models/changes'
import {useNavRoute} from '@mintter/app/src/utils/navigation'
import {useNavigate} from '@mintter/app/src/utils/useNavigate'
import {formattedDate, pluralS} from '@mintter/shared'
import {Button, SizableText, XStack} from '@mintter/ui'
import {getAvatarUrl} from '../utils/account-url'
import {AccessoryContainer} from './accessory-sidebar'
import {useAllChanges} from '@mintter/app/models/changes'

function ChangeItem({
  change,
  entityId,
  active,
}: {
  change: SmartChangeInfo
  entityId: string
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
          documentId: entityId,
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
          <Avatar
            id={change.author}
            label={author?.data?.profile?.alias}
            url={getAvatarUrl(author?.data?.profile?.avatar)}
          />
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
          entityId={docId}
          key={change.id}
          change={change}
          active={change.version === version}
        />
      ))}
    </AccessoryContainer>
  )
}

export function EntityVersionsAccessory({
  id,
  activeVersion,
}: {
  id?: string
  activeVersion?: string
}) {
  const route = useNavRoute()
  // const version = route.key === 'publication' ? route.versionId : undefined
  // const docId = route.key === 'publication' ? route.documentId : undefined
  const {data} = useAllChanges(id)
  if (!id) return null
  const count = Object.keys(data?.changes || {})?.length || 0
  return (
    <AccessoryContainer title={`${count} Doc ${pluralS(count, 'Version')}`}>
      {Object.entries(data?.changes || {}).map(([changeId, change]) => {
        return (
          <ChangeItem
            entityId={id}
            key={changeId}
            change={change}
            active={
              !!activeVersion &&
              !!activeVersion.split('.').find((chId) => change.id === chId)
            }
          />
        )
      })}
    </AccessoryContainer>
  )
}
