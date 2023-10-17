import {
  Account,
  DefaultStaticBlockUnknown,
  Group,
  StaticBlockNode,
  StaticEmbedProps,
  StaticGroup,
  blockStyles,
  createHmId,
  getBlockNodeById,
} from '@mintter/shared'
import {SizableText, UIAvatar, XStack, YStack} from '@mintter/ui'
import {Book} from '@tamagui/lucide-icons'
import {useMemo} from 'react'
import {useAccount} from '../models/accounts'
import {usePublication} from '../models/documents'
import {useGroup} from '../models/groups'
import {getAvatarUrl} from '../utils/account-url'
import {NavRoute} from '../utils/navigation'

export function StaticBlockPublication(props: StaticEmbedProps) {
  const docId = props.type == 'd' ? createHmId('d', props.eid) : undefined
  const pub = usePublication({
    id: docId,
    version: props.version || undefined,
    enabled: !!docId,
  })

  let embedData = useMemo(() => {
    const {data} = pub

    const selectedBlock =
      props.blockRef && data?.document?.children
        ? getBlockNodeById(data.document.children, props.blockRef)
        : null

    const embedBlocks = selectedBlock
      ? [selectedBlock]
      : data?.document?.children

    return {
      ...pub,
      data: {
        publication: pub.data,
        embedBlocks,
      },
    }
  }, [props.blockRef, pub])

  return (
    <YStack
      {...blockStyles}
      className="block-static block-embed"
      backgroundColor="$color5"
      hoverStyle={{
        backgroundColor: '$color6',
      }}
      overflow="hidden"
      borderRadius="$3"
    >
      {embedData.data.embedBlocks?.length ? (
        <StaticGroup childrenType="group">
          {embedData.data.embedBlocks.map((bn, idx) => (
            <StaticBlockNode
              key={bn.block?.id}
              depth={1}
              blockNode={bn}
              childrenType="group"
              index={idx}
              embedDepth={1}
            />
          ))}
        </StaticGroup>
      ) : (
        <DefaultStaticBlockUnknown {...props} />
      )}
    </YStack>
  )
}

export function StaticBlockGroup(props: StaticEmbedProps) {
  const groupId = props.type == 'g' ? createHmId('g', props.eid) : undefined
  const groupQuery = useGroup(groupId, props.version || undefined)

  return groupQuery.status == 'success' ? (
    <YStack
      flex={1}
      overflow="hidden"
      borderRadius="$3"
      backgroundColor="$backgroundFocus"
      hoverStyle={{
        backgroundColor: '$color6',
      }}
    >
      <XStack gap="$3" padding="$4" alignItems="flex-start">
        <XStack paddingVertical="$3">
          <Book size={36} />
        </XStack>
        <YStack justifyContent="center" flex={1}>
          <SizableText size="$1" opacity={0.5} flex={0}>
            Group
          </SizableText>
          <YStack gap="$2">
            <SizableText size="$6" fontWeight="bold">
              {groupQuery.data?.title}
            </SizableText>
            <SizableText size="$2">
              Some random group description...
            </SizableText>
          </YStack>
        </YStack>
      </XStack>
    </YStack>
  ) : null
}

export function StaticBlockAccount(props: StaticEmbedProps) {
  const accountId = props.type == 'a' ? props.eid : undefined
  const accountQuery = useAccount(accountId)

  return accountQuery.status == 'success' ? (
    <YStack
      flex={1}
      overflow="hidden"
      borderRadius="$3"
      backgroundColor="$backgroundFocus"
      hoverStyle={{
        backgroundColor: '$color6',
      }}
    >
      <XStack gap="$3" padding="$4" alignItems="flex-start">
        <XStack paddingVertical="$3">
          <UIAvatar
            id={accountQuery.data.id}
            size={36}
            label={accountQuery.data.profile?.alias}
            url={getAvatarUrl(accountQuery.data.profile?.avatar)}
          />
        </XStack>
        <YStack justifyContent="center" flex={1}>
          <SizableText size="$1" opacity={0.5} flex={0}>
            Account
          </SizableText>
          <YStack gap="$2">
            <SizableText size="$6" fontWeight="bold">
              {accountQuery.data?.profile?.alias}
            </SizableText>
            <SizableText size="$2">
              {accountQuery.data.profile?.bio}
            </SizableText>
          </YStack>
        </YStack>
      </XStack>
    </YStack>
  ) : null
}

function EntityCard({
  title,
  icon,
  description,
  route,
}: {
  title?: string
  icon?: React.ReactNode
  description?: string
  route: NavRoute
}) {
  return (
    <YStack {...blockStyles}>
      <span>{JSON.stringify({title, description, route})}</span>
    </YStack>
  )
}
function GroupCard({group}: {group: Group}) {
  return (
    <EntityCard
      title={group.title}
      description={group.description}
      route={{key: 'group', groupId: group.id}}
      icon={<Book />}
    />
  )
}
function AccountCard({account}: {account: Account}) {
  return (
    <EntityCard
      title={account.profile?.alias}
      description={account.profile?.bio}
      route={{key: 'account', accountId: account.id}}
      icon={
        <UIAvatar
          id={account.id}
          size={24}
          label={account.profile?.alias}
          url={getAvatarUrl(account.profile?.avatar)}
        />
      }
    />
  )
}
