import {
  DefaultStaticBlockUnknown,
  EmbedContentAccount,
  EmbedContentGroup,
  StaticBlockNode,
  StaticEmbedProps,
  StaticGroup,
  blockStyles,
  createHmId,
  getBlockNodeById,
  useStaticPublicationContext,
} from '@mintter/shared'
import {hmGroup} from '@mintter/shared/src/to-json-hm'
import {SizableText, Spinner, UIAvatar, XStack, YStack} from '@mintter/ui'
import {Book} from '@tamagui/lucide-icons'
import {PropsWithChildren, useMemo} from 'react'
import {useAccount} from '../models/accounts'
import {usePublication} from '../models/documents'
import {useGroup} from '../models/groups'
import {useOpenUrl} from '../open-url'
import {getAvatarUrl} from '../utils/account-url'
import {unpackHmIdWithAppRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'

function EmbedWrapper(props: PropsWithChildren<{hmRef: string}>) {
  const {disableEmbedClick = false} = useStaticPublicationContext()
  let spawn = useNavigate('spawn')
  return (
    <YStack
      // @ts-expect-error
      contentEditable={false}
      userSelect="none"
      {...blockStyles}
      className="block-static block-embed"
      hoverStyle={{
        cursor: 'pointer',
        backgroundColor: '$color5',
      }}
      overflow="hidden"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$color5"
      onPress={
        !disableEmbedClick
          ? () => {
              const unpacked = unpackHmIdWithAppRoute(props.hmRef)
              if (unpacked?.navRoute && unpacked?.scheme === 'hm') {
                spawn(unpacked?.navRoute)
              }
            }
          : undefined
      }
    >
      {props.children}
    </YStack>
  )
}

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

  if (embedData.isLoading) return <Spinner />
  return (
    <EmbedWrapper hmRef={props.id}>
      {embedData.data.embedBlocks?.length ? (
        <StaticGroup childrenType="group" marginLeft="-1.5em">
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
    </EmbedWrapper>
  )
}

export function StaticBlockGroup(props: StaticEmbedProps) {
  const groupId = props.type == 'g' ? createHmId('g', props.eid) : undefined
  const groupQuery = useGroup(groupId, props.version || undefined)

  const group = hmGroup(groupQuery.data)
  return group && groupQuery.status == 'success' ? (
    <EmbedWrapper hmRef={props.id}>
      <EmbedContentGroup group={group} />
    </EmbedWrapper>
  ) : null
}

export function StaticBlockAccount(props: StaticEmbedProps) {
  const accountId = props.type == 'a' ? props.eid : undefined
  const accountQuery = useAccount(accountId)

  return accountQuery.status == 'success' ? (
    <EmbedWrapper hmRef={props.id}>
      <EmbedContentAccount account={accountQuery.data} />
    </EmbedWrapper>
  ) : null
}
