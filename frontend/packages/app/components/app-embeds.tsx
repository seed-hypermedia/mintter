import {
  API_FILE_URL,
  BlockContentUnknown,
  BlockNodeContent,
  BlockNodeList,
  EmbedContentAccount,
  EmbedContentGroup,
  EntityComponentProps,
  PublicationCardView,
  blockStyles,
  createHmId,
  formattedDateMedium,
  getBlockNodeById,
  usePublicationContentContext,
} from '@mintter/shared'
import {hmGroup} from '@mintter/shared/src/to-json-hm'
import {SizableText, Spinner, UIAvatar, XStack, YStack} from '@mintter/ui'
import {PropsWithChildren, useMemo} from 'react'
import {useAccount} from '../models/accounts'
import {useComment} from '../models/comments'
import {usePublication} from '../models/documents'
import {useGroup} from '../models/groups'
import {useOpenUrl} from '../open-url'
import {getAvatarUrl} from '../utils/account-url'
import {Avatar} from './avatar'

function EmbedWrapper(props: PropsWithChildren<{hmRef: string}>) {
  const {disableEmbedClick = false, layoutUnit} = usePublicationContentContext()
  const open = useOpenUrl()
  return (
    <YStack
      contentEditable={false}
      userSelect="none"
      {...blockStyles}
      className="block-embed"
      backgroundColor="$color4"
      hoverStyle={{
        cursor: 'pointer',
        backgroundColor: '$color5',
      }}
      margin={0}
      marginHorizontal={(-1 * layoutUnit) / 2}
      padding={layoutUnit / 2}
      overflow="hidden"
      borderRadius={layoutUnit / 4}
      onPress={
        !disableEmbedClick
          ? () => {
              open(props.hmRef, true)
            }
          : undefined
      }
    >
      {props.children}
    </YStack>
  )
}

export function EmbedPublicationContent(props: EntityComponentProps) {
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

export function EmbedPublicationCard(props: EntityComponentProps) {
  const docId = props.type == 'd' ? createHmId('d', props.eid) : undefined
  const pub = usePublication({
    id: docId,
    version: props.version || undefined,
    enabled: !!docId,
  })

  let textContent = useMemo(() => {
    if (pub.data?.document?.children) {
      let content = ''
      pub.data?.document?.children.forEach((bn) => {
        content += bn.block?.text + ' '
      })
      return content
    }
  }, [pub.data])

  return (
    <EmbedWrapper hmRef={props.id}>
      <PublicationCardView
        title={pub.data?.document?.title}
        textContent={textContent}
        editors={pub.data?.document?.editors || []}
        AvatarComponent={AvatarComponent}
        date={pub.data?.document?.updateTime}
      />
    </EmbedWrapper>
  )
}

export function EmbedComment(props: EntityComponentProps) {
  if (props?.type !== 'c')
    throw new Error('Invalid props as ref for EmbedComment')
  const comment = useComment(createHmId('c', props.eid), {
    enabled: !!props,
  })
  let embedBlocks = useMemo(() => {
    const selectedBlock =
      props.blockRef && comment.data?.content
        ? getBlockNodeById(comment.data.content, props.blockRef)
        : null

    const embedBlocks = selectedBlock ? [selectedBlock] : comment.data?.content

    return embedBlocks
  }, [props.blockRef, comment.data])
  const account = useAccount(comment.data?.author)
  if (comment.isLoading) return <Spinner />
  return (
    <EmbedWrapper hmRef={props.id}>
      <XStack flexWrap="wrap" jc="space-between">
        <XStack gap="$2">
          <UIAvatar
            label={account.data?.profile?.alias}
            id={account.data?.id}
            url={
              account.data?.profile?.avatar
                ? `${API_FILE_URL}/${account.data?.profile?.avatar}`
                : undefined
            }
          />
          <SizableText>{account.data?.profile?.alias}</SizableText>
        </XStack>
        {comment.data.publishTime ? (
          <SizableText fontSize="$2" color="$color10">
            {formattedDateMedium(new Date(comment.data.publishTime))}
          </SizableText>
        ) : null}
      </XStack>
      {embedBlocks?.length ? (
        <BlockNodeList childrenType="group">
          {embedBlocks.map((bn, idx) => (
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

function AvatarComponent({accountId}: {accountId: string}) {
  let {data: account} = useAccount(accountId)
  return (
    <Avatar
      label={account?.profile?.alias}
      id={accountId}
      url={getAvatarUrl(account?.profile?.avatar)}
    />
  )
}

export function EmbedGroup(props: EntityComponentProps) {
  const groupId = props.type == 'g' ? createHmId('g', props.eid) : undefined
  const groupQuery = useGroup(groupId, props.version || undefined)

  const group = hmGroup(groupQuery.data)
  return group && groupQuery.status == 'success' ? (
    <EmbedWrapper hmRef={props.id}>
      <EmbedContentGroup group={group} />
    </EmbedWrapper>
  ) : null
}

export function EmbedAccount(props: EntityComponentProps) {
  const accountId = props.type == 'a' ? props.eid : undefined
  const accountQuery = useAccount(accountId)

  return accountQuery.status == 'success' ? (
    <EmbedWrapper hmRef={props.id}>
      <EmbedContentAccount account={accountQuery.data} />
    </EmbedWrapper>
  ) : null
}
