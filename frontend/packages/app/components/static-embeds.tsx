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
  const groupId = props.type == 'g' ? createHmId('d', props.eid) : undefined
  const groupQuery = useGroup(groupId, props.version || undefined)

  if (groupQuery.status == 'success') {
    return <GroupCard group={groupQuery.data} />
  }

  return null
}

export function StaticBlockAccount(props: StaticEmbedProps) {
  const accountId = props.type == 'a' ? props.eid : undefined
  const accountQuery = useAccount(accountId)

  if (accountQuery.status == 'success') {
    return <AccountCard account={accountQuery.data} />
  }

  return null
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
    <XStack gap="$3">
      {icon}
      <YStack>
        <SizableText size="$5" fontWeight="bold" fontFamily="$body">
          {title}
        </SizableText>
        <SizableText fontFamily="$body">{description}</SizableText>
      </YStack>
    </XStack>
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
