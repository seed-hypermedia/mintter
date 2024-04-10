import {
  API_FILE_URL,
  BlockContentUnknown,
  BlockNodeContent,
  BlockNodeList,
  ContentEmbed,
  EmbedAccountContent,
  EmbedGroupCardContent,
  EntityComponentProps,
  ErrorBlock,
  InlineEmbedComponentProps,
  PublicationCardView,
  blockStyles,
  createHmId,
  formattedDateMedium,
  getBlockNodeById,
  hmGroup,
  unpackHmId,
  usePublicationContentContext,
} from '@mintter/shared'
import {
  Button,
  ButtonText,
  SizableText,
  Spinner,
  UIAvatar,
  XStack,
  YStack,
} from '@mintter/ui'
import {ArrowUpRightSquare} from '@tamagui/lucide-icons'
import {ComponentProps, PropsWithChildren, useMemo, useState} from 'react'
import {useAccount} from '../models/accounts'
import {useComment} from '../models/comments'
import {useGroup, useGroupFrontpage} from '../models/groups'
import {usePublicationVariant} from '../models/publication'
import {useOpenUrl} from '../open-url'
import {getAvatarUrl} from '../utils/account-url'
import {useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'
import {Avatar} from './avatar'

function EmbedWrapper({
  hmRef,
  children,
  ...props
}: PropsWithChildren<{hmRef: string} & ComponentProps<typeof YStack>>) {
  const {
    disableEmbedClick = false,
    layoutUnit,
    comment,
    routeParams,
  } = usePublicationContentContext()
  const route = useNavRoute()
  const open = useOpenUrl()
  const navigate = useNavigate('replace')
  const unpackRef = unpackHmId(hmRef)

  const isHighlight = useMemo(() => {
    return (
      routeParams?.documentId == unpackRef?.qid &&
      routeParams?.version == unpackRef?.version &&
      comment
    )
  }, [
    routeParams?.documentId,
    routeParams?.version,
    comment,
    unpackRef?.qid,
    unpackRef?.version,
  ])

  return (
    <YStack
      // @ts-expect-error
      contentEditable={false}
      userSelect="none"
      {...blockStyles}
      className="block-embed"
      backgroundColor={
        isHighlight
          ? routeParams?.blockRef == unpackRef?.blockRef
            ? '$yellow3'
            : '$backgroundTransparent'
          : '$backgroundTransparent'
      }
      hoverStyle={{
        cursor: 'pointer',
        backgroundColor:
          isHighlight && routeParams?.blockRef == unpackRef?.blockRef
            ? '$yellow4'
            : '$backgroundHover',
        borderRadius: '$2',
        borderLeftColor: '$color7',
      }}
      margin={0}
      marginHorizontal={(-1 * layoutUnit) / 2}
      padding={layoutUnit / 2}
      overflow="hidden"
      borderRadius={0}
      borderLeftWidth={6}
      borderLeftColor={isHighlight ? '$yellow6' : '$color4'}
      onPress={
        !disableEmbedClick
          ? () => {
              // if (comment && route.key == 'publication' && route.documentId == )
              // open(hmRef, true)
              if (comment) {
                if (
                  route.key == 'publication' &&
                  unpackRef?.qid == route.documentId
                ) {
                  navigate({
                    ...route,
                    blockId: unpackRef?.blockRef!,
                    versionId: unpackRef?.version!,
                  })
                }
              } else {
                open(hmRef, true)
              }
            }
          : undefined
      }
      {...props}
    >
      {children}
    </YStack>
  )
}

export function EmbedPublication(props: EntityComponentProps) {
  if (props.block.attributes?.view == 'card') {
    return <EmbedPublicationCard {...props} />
  } else {
    return <EmbedPublicationContent {...props} />
  }
}

export function EmbedPublicationContent(props: EntityComponentProps) {
  const documentId = props.type == 'd' ? createHmId('d', props.eid) : undefined
  const [showReferenced, setShowReferenced] = useState(false)
  const pub = usePublicationVariant({
    documentId,
    versionId:
      showReferenced && props.version
        ? props.version
        : props.latest
        ? undefined
        : props.version || undefined,
    variants: props.variants || undefined,
    enabled: !!documentId,
  })
  const spawn = useNavigate('spawn')
  return (
    <ContentEmbed
      props={props}
      isLoading={pub.isInitialLoading}
      showReferenced={showReferenced}
      onShowReferenced={setShowReferenced}
      pub={pub.data?.publication}
      EmbedWrapper={EmbedWrapper}
      renderOpenButton={() =>
        documentId && (
          <Button
            size="$2"
            icon={ArrowUpRightSquare}
            onPress={() => {
              if (!documentId) return
              spawn({
                key: 'publication',
                documentId,
                variants: props.variants || undefined,
                versionId: props.version || undefined,
              })
            }}
          >
            Open Document
          </Button>
        )
      }
    />
  )
}

export function EmbedPublicationCard(props: EntityComponentProps) {
  // we can't pass anything else to `createHmId` because this is creating the string we need to pass to getPublication
  const docId = props.type == 'd' ? createHmId('d', props.eid) : undefined
  const pub = usePublicationVariant({
    documentId: docId,
    versionId: props.latest ? undefined : props.version || undefined,
    variants: props.variants || undefined,
    enabled: !!docId,
  })
  let textContent = useMemo(() => {
    if (pub.data?.publication?.document?.children) {
      let content = ''
      pub.data?.publication?.document?.children.forEach((bn) => {
        content += bn.block?.text + ' '
      })
      return content
    }
  }, [pub.data])

  return (
    <EmbedWrapper hmRef={props.id}>
      <PublicationCardView
        title={pub.data?.publication?.document?.title}
        textContent={textContent}
        editors={pub.data?.publication?.document?.editors || []}
        AvatarComponent={AvatarComponent}
        date={pub.data?.publication?.document?.updateTime}
      />
    </EmbedWrapper>
  )
}

export function EmbedAccount(props: EntityComponentProps) {
  const accountId = props.type == 'a' ? props.eid : undefined
  const accountQuery = useAccount(accountId)

  if (accountQuery.status == 'success') {
    if (
      props.block?.attributes?.view == 'content' &&
      accountQuery.data?.profile?.rootDocument
    ) {
      const unpackedRef = unpackHmId(accountQuery.data?.profile?.rootDocument)
      return <EmbedPublicationContent {...props} {...unpackedRef} />
    } else if (props.block?.attributes?.view == 'card') {
      return (
        <EmbedWrapper hmRef={props.id}>
          <EmbedAccountContent account={accountQuery.data!} />
        </EmbedWrapper>
      )
    }

    return null
  }
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
        {comment.data?.createTime ? (
          <SizableText fontSize="$2" color="$color10">
            {formattedDateMedium(comment.data.createTime)}
          </SizableText>
        ) : null}
      </XStack>
      {embedBlocks?.length ? (
        <BlockNodeList childrenType="group">
          {embedBlocks.map((bn, idx) => (
            <BlockNodeContent
              isFirstChild={idx === 0}
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
  if (props.block?.attributes?.view == 'content') {
    return <EmbedGroupContent groupId={groupId} {...props} />
  } else if (props.block?.attributes?.view == 'card') {
    return <EmbedGroupCard groupId={groupId} {...props} />
  }

  return (
    <ErrorBlock
      message={`EmbedGroup view error: ${JSON.stringify(props.block)}`}
    />
  )
}

export function EmbedGroupCard(
  props: EntityComponentProps & {groupId?: string},
) {
  const groupQuery = useGroup(props.groupId, props.version || undefined)

  const group = hmGroup(groupQuery.data)

  return group && groupQuery.status == 'success' ? (
    <EmbedWrapper hmRef={props.id}>
      <EmbedGroupCardContent group={group} />
    </EmbedWrapper>
  ) : null
}

function EmbedGroupContent(props: EntityComponentProps & {groupId?: string}) {
  const groupFrontPage = useGroupFrontpage(
    props.groupId,
    props.version || undefined,
  )

  if (groupFrontPage) {
    return <EmbedPublicationContent {...props} {...groupFrontPage} />
  }

  return null
}

export function EmbedInline(props: InlineEmbedComponentProps) {
  const accountId = props?.type == 'a' ? props.eid : undefined
  if (!accountId) throw new Error('Invalid props at AppInlineEmbed (accountId)')
  const accountQuery = useAccount(accountId)
  const navigate = useNavigate()
  return (
    <Button
      bg="$backgroundTransparent"
      hoverStyle={{
        bg: '$backgroundTransparent',
      }}
      unstyled
      onPress={() => navigate({key: 'account', accountId})}
      style={{
        display: 'inline-block',
        lineHeight: 1,
        border: 'none',
      }}
    >
      <ButtonText
        textDecorationColor={'$mint11'}
        color="$mint11"
        className="hm-link"
        fontSize="$5"
      >
        {(accountId &&
          accountQuery.status == 'success' &&
          `@${accountQuery.data?.profile?.alias}`) ||
          `@${accountId?.slice(0, 5) + '...' + accountId?.slice(-5)}`}
      </ButtonText>
    </Button>
  )
}
