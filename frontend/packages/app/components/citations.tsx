import {useEntityMentions} from '@mintter/app/models/content-graph'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {
  BlockRange,
  BlocksContent,
  ExpandedBlockRange,
  HYPERMEDIA_SCHEME,
  formattedDateMedium,
  pluralS,
  serializeBlockRange,
  unpackHmId,
} from '@mintter/shared'
import {Mention} from '@mintter/shared/src/client/.generated/entities/v1alpha/entities_pb'
import {
  ButtonText,
  PanelCard,
  SizableText,
  XStack,
  YStack,
  copyUrlToClipboardWithFeedback,
} from '@mintter/ui'
import {useMemo} from 'react'
import {useAccount} from '../models/accounts'
import {useEntityTimeline} from '../models/changes'
import {useComment} from '../models/comments'
import {useDocTextContent, usePublication} from '../models/documents'
import {AppPublicationContentProvider} from '../pages/publication-content-provider'
import {PublicationRoute} from '../utils/routes'
import {AccessoryContainer} from './accessory-sidebar'
import {AccountLinkAvatar} from './account-link-avatar'

function CitationItem({mention}: {mention: Mention}) {
  if (!mention.source) throw 'Invalid citation'

  if (mention.source.startsWith(`${HYPERMEDIA_SCHEME}://d`)) {
    return <PublicationCitationItem mention={mention} />
  }

  if (mention.source.startsWith(`${HYPERMEDIA_SCHEME}://c`)) {
    return <CommentCitationItem mention={mention} />
  }

  return null
}

function PublicationCitationItem({mention}: {mention: Mention}) {
  const spawn = useNavigate('spawn')
  const unpackedSource = unpackHmId(mention.source)
  const pub = usePublication(
    {
      id: mention.source,
      version: mention.sourceBlob?.cid,
    },
    {
      enabled: !!mention.source,
    },
  )
  const versionChanges = new Set(unpackedSource?.version?.split('.'))
  const timeline = useEntityTimeline(mention.source)
  const authors = new Set(
    timeline.data?.timelineEntries
      .filter(([changeId]) => versionChanges.has(changeId))
      .map(([changeId, change]) => change.author),
  )
  let {data: account} = useAccount(pub.data?.document?.author)

  const docTextContent = useDocTextContent(pub.data)
  const destRoute: PublicationRoute = {
    key: 'publication',
    documentId: unpackedSource!.qid,
    versionId: mention.sourceBlob?.cid,
    blockId: mention.sourceContext,
    variants: [...authors].map((author) => ({key: 'author', author})),
  }
  return (
    <PanelCard
      title={pub.data?.document?.title}
      content={docTextContent}
      author={account}
      date={formattedDateMedium(pub.data?.document?.createTime)}
      onPress={() => {
        if (unpackedSource) {
          spawn(destRoute)
        }
      }}
      avatar={
        <AccountLinkAvatar accountId={pub.data?.document?.author} size={24} />
      }
    />
  )
}

function CommentCitationItem({mention}: {mention: Mention}) {
  const spawn = useNavigate('spawn')
  const unpackedSource = unpackHmId(mention.source)
  const {data: comment} = useComment(unpackedSource?.id, {
    enabled: !!mention.source && !!unpackedSource,
  })

  const commentTarget = useMemo(() => {
    if (comment?.target) {
      return unpackHmId(comment.target)
    }
    return null
  }, [comment])

  const pub = usePublication(
    {
      id: commentTarget?.qid,
      version: commentTarget?.version || undefined,
    },
    {
      enabled: !!commentTarget,
    },
  )

  let {data: account} = useAccount(comment?.author)

  // const docTextContent = useDocTextContent(pub.data)
  // const destRoute: PublicationRoute = {
  //   key: 'publication',
  //   documentId: unpackedSource!.qid,
  //   versionId: mention.sourceBlob?.cid,
  //   blockId: mention.sourceContext,
  //   variants: [...authors].map((author) => ({key: 'author', author})),
  // }

  return (
    <YStack
      overflow="hidden"
      borderRadius="$2"
      backgroundColor={'$backgroundTransparent'}
      hoverStyle={{
        cursor: 'pointer',
        backgroundColor: '$backgroundHover',
      }}
      margin="$4"
      padding="$4"
      paddingVertical="$4"
      gap="$2"
      onPress={() => {
        if (comment) {
          spawn({
            key: 'comment',
            commentId: comment.id,
            showThread: false,
          })
        }
      }}
    >
      <XStack gap="$2" ai="center">
        <AccountLinkAvatar accountId={comment?.author} size={24} />
        <SizableText size="$2" fontWeight="600">
          {account?.profile?.alias || '...'}
        </SizableText>
        {pub?.data?.document?.title ? (
          <>
            <SizableText flexShrink="0" size="$2">
              comment on{' '}
            </SizableText>
            <ButtonText
              size="$4"
              fontSize="$2"
              textDecorationLine="underline"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              width="100%"
              overflow="hidden"
              onPress={() => {
                if (commentTarget) {
                  spawn({
                    key: 'publication',
                    documentId: commentTarget.qid,
                    versionId: commentTarget.version || undefined,
                    variants: commentTarget.variants || [],
                  })
                }
              }}
            >
              {pub.data.document.title}
            </ButtonText>
          </>
        ) : null}

        <XStack flex={1} />
        <SizableText
          flexShrink={0}
          size="$2"
          color="$color9"
          paddingHorizontal="$1"
        >
          {formattedDateMedium(comment?.createTime)}
        </SizableText>
      </XStack>
      <YStack gap="$2" flex={1} marginHorizontal="$-2">
        <AppPublicationContentProvider
          comment
          // onReplyBlock={onReplyBlock}
          onCopyBlock={(
            blockId: string,
            blockRange: BlockRange | ExpandedBlockRange | undefined,
          ) => {
            const url = `${comment?.id}#${blockId}${serializeBlockRange(
              blockRange,
            )}`
            copyUrlToClipboardWithFeedback(url, 'Comment Block')
          }}
        >
          <BlocksContent blocks={comment?.content} parentBlockId={null} />
        </AppPublicationContentProvider>
      </YStack>
    </YStack>
    // <PanelCard
    //   title={pub.data?.document?.title}
    //   content={docTextContent}
    //   author={account}
    //   date={formattedDateMedium(pub.data?.document?.createTime)}
    //   onPress={() => {
    //     if (unpackedSource) {
    //       spawn(destRoute)
    //     }
    //   }}
    //   avatar={
    //     <AccountLinkAvatar accountId={pub.data?.document?.author} size={24} />
    //   }
    // />
  )
}

export function DocCitationsAccessory({docId}: {docId?: string}) {
  const mentions = useEntityMentions(docId)
  if (!docId) return null
  const count = mentions.data?.mentions?.length || 0

  const citationSet = new Set()
  const distinctMentions = mentions.data?.mentions.filter((item) => {
    if (!citationSet.has(item?.source)) {
      citationSet.add(item?.source)
      return true
    }
    return false
  })

  // TODO: This code also filters citations based on version of document where citation is used and on blockId, which was cited.
  // The current code will show only distinct documents, but if the first citation was in old version, it will point to the old version, which I feel is not good.
  // Maybe we could display version with document title, and/or blockId, which was cited.
  // const distinctMentions = citations?.links?.map(item => {
  //   const { source, target } = item;
  //   const combination = `${source?.documentId}-${source?.version}-${target?.blockId}`;

  //   if (!citationSet.has(combination)) {
  //     citationSet.add(combination);
  //     return item
  //   }

  //   return null;
  // }).filter(item => item !== null);

  return (
    <AccessoryContainer title={`${count} ${pluralS(count, 'Citation')}`}>
      {distinctMentions?.map((mention, index) => (
        <CitationItem
          key={`${mention.source}${mention.targetVersion}${mention.targetFragment}`}
          mention={mention}
        />
      ))}
    </AccessoryContainer>
  )
}

export function EntityCitationsAccessory({entityId}: {entityId?: string}) {
  const mentions = useEntityMentions(entityId)
  if (!entityId) return null
  const count = mentions?.data?.mentions?.length || 0

  const citationSet = new Set()
  const distinctMentions = mentions?.data?.mentions?.filter((item) => {
    if (!citationSet.has(item?.source)) {
      citationSet.add(item?.source)
      return true
    }
    return false
  })

  return (
    <AccessoryContainer title={`${count} ${pluralS(count, 'Citation')}`}>
      {distinctMentions?.map((mention, index) => (
        <CitationItem
          key={`${mention.source}${mention.targetVersion}${mention.targetFragment}`}
          mention={mention}
        />
      ))}
    </AccessoryContainer>
  )
}
