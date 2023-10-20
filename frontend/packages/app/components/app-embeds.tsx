import {
  BlockContentProps,
  BlockContentUnknown,
  BlockNodeContent,
  BlockNodeList,
  EmbedContentAccount,
  EmbedContentGroup,
  blockStyles,
  createHmId,
  getBlockNodeById,
  usePublicationContentContext,
} from '@mintter/shared'
import {hmGroup} from '@mintter/shared/src/to-json-hm'
import {Spinner, YStack} from '@mintter/ui'
import {PropsWithChildren, useMemo} from 'react'
import {useAccount} from '../models/accounts'
import {usePublication} from '../models/documents'
import {useGroup} from '../models/groups'
import {unpackHmIdWithAppRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'

function EmbedWrapper(props: PropsWithChildren<{hmRef: string}>) {
  const {disableEmbedClick = false} = usePublicationContentContext()
  let spawn = useNavigate('spawn')
  return (
    <YStack
      // @ts-expect-error
      contentEditable={false}
      userSelect="none"
      {...blockStyles}
      className="block-embed"
      backgroundColor="$color4"
      hoverStyle={{
        cursor: 'pointer',
        backgroundColor: '$color5',
        // borderColor: '$color6',
      }}
      margin={0}
      marginLeft={-13}
      width="calc(100% + 13px)"
      padding="$2"
      overflow="hidden"
      borderRadius="$3"
      borderWidth={2}
      borderColor="transparent"
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

export function EmbedPublication(props: BlockContentProps) {
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
        <BlockNodeList childrenType="group">
          {embedData.data.embedBlocks.map((bn, idx) => (
            <BlockNodeContent
              key={bn.block?.id}
              depth={1}
              blockNode={bn}
              childrenType="group"
              index={idx}
              embedDepth={1}
            />
          ))}
        </BlockNodeList>
      ) : (
        <BlockContentUnknown {...props} />
      )}
    </EmbedWrapper>
  )
}

export function EmbedGroup(props: BlockContentProps) {
  const groupId = props.type == 'g' ? createHmId('g', props.eid) : undefined
  const groupQuery = useGroup(groupId, props.version || undefined)

  const group = hmGroup(groupQuery.data)
  return group && groupQuery.status == 'success' ? (
    <EmbedWrapper hmRef={props.id}>
      <EmbedContentGroup group={group} />
    </EmbedWrapper>
  ) : null
}

export function EmbedAccount(props: BlockContentProps) {
  const accountId = props.type == 'a' ? props.eid : undefined
  const accountQuery = useAccount(accountId)

  return accountQuery.status == 'success' ? (
    <EmbedWrapper hmRef={props.id}>
      <EmbedContentAccount account={accountQuery.data} />
    </EmbedWrapper>
  ) : null
}
