import {useAccount_deprecated} from '@/models/accounts'
import {useDocument} from '@/models/documents'
import {AppDocContentProvider} from '@/pages/document-content-provider'
import {trpc} from '@/trpc'
import {useNavigate} from '@/utils/useNavigate'
import {
  API_FILE_URL,
  BlockRange,
  BlocksContent,
  ExpandedBlockRange,
  HMComment,
  StateStream,
  UnpackedHypermediaId,
  createHmId,
  formattedDateMedium,
  getDocumentTitle,
  serializeBlockRange,
  unpackHmId,
} from '@shm/shared'
import {
  Button,
  ButtonText,
  SizableText,
  Text,
  UIAvatar,
  View,
  XStack,
  copyUrlToClipboardWithFeedback,
  useStream,
} from '@shm/ui'
import {
  ArrowUpRight,
  Copy,
  MessageSquare,
  Pencil,
  Reply,
} from '@tamagui/lucide-icons'
import {YStack} from 'tamagui'
import {useAppContext} from '../app-context'
import type {CommentGroup} from '../models/comments'
import {
  useCommentReplies,
  useCreateComment,
  useDocumentCommentGroups,
} from '../models/comments'
import {AccessoryContainer} from './accessory-sidebar'
import {MenuItemType, OptionsDropdown} from './options-dropdown'
import {WindowsLinuxWindowControls} from './window-controls'

export function CommentGroup({
  group,
  targetDocEid,
  targetDocVersion,
}: {
  group: CommentGroup
  targetDocEid: string
  targetDocVersion: string
}) {
  const createComment = useCreateComment()
  const spawn = useNavigate('spawn')
  return (
    <YStack position="relative">
      <View
        backgroundColor={'$borderColor'}
        position="absolute"
        width={1}
        top={20}
        bottom={20}
        left={28}
      />
      {group.comments?.map((comment) => {
        if (!comment.createTime) return null
        const lastComment = group.comments.at(-1)
        return (
          <CommentPresentation
            key={comment.id}
            comment={comment}
            menuItems={[
              {
                key: 'reply',
                label: 'Reply',
                icon: Reply,
                onPress: () => {
                  createComment(targetDocEid, targetDocVersion, comment.id)
                },
              },
              {
                key: 'copyLink',
                label: 'Copy Link',
                icon: Copy,
                onPress: () => {
                  copyUrlToClipboardWithFeedback(comment.id, 'Comment')
                },
              },
              {
                key: 'openNewWindow',
                label: 'Open in New Window',
                icon: ArrowUpRight,
                onPress: () => {
                  spawn({
                    key: 'comment',
                    commentId: comment.id,
                    showThread: false,
                  })
                },
              },
            ]}
            onReplyBlock={(blockId: string) => {
              if (!lastComment) return
              const targetId = unpackHmId(lastComment.id)
              const quotingCommentId = unpackHmId(comment.id)
              if (!targetId || !quotingCommentId) return
              createComment(
                targetDocEid,
                targetDocVersion,
                lastComment.id,
                createHmId('c', quotingCommentId.eid, {
                  blockRef: blockId,
                }),
              )
            }}
          />
        )
      })}
      <XStack>
        {group.moreCommentsCount ? (
          <Button
            size="$2"
            marginHorizontal="$4"
            onPress={() => {
              const lastComment = group.comments.at(-1)
              if (!lastComment) throw new Error('lastComment not here')
              spawn({
                key: 'comment',
                commentId: lastComment?.id,
              })
            }}
            icon={MessageSquare}
          >
            {`${group.moreCommentsCount}${
              group.comments.length > 1 ? ' More' : ''
            } Replies`}
          </Button>
        ) : (
          <Button
            size="$2"
            marginHorizontal="$4"
            onPress={() => {
              const lastComment = group.comments.at(-1)
              if (!lastComment) return
              createComment(targetDocEid, targetDocVersion, lastComment.id)
            }}
            icon={Reply}
          >
            Reply
          </Button>
        )}
      </XStack>
    </YStack>
  )
}

export function CommentThread({
  targetCommentId,
  targetDocEid,
  onReplyBlock,
}: {
  targetCommentId: string
  targetDocEid: string
  onReplyBlock: (commentId: string, blockId: string) => void
}) {
  const thread = useCommentReplies(targetCommentId, targetDocEid)
  return (
    <>
      <YStack borderBottomWidth={1} borderColor="$borderColor">
        {thread?.map((comment) => {
          if (!comment) return null
          return (
            <CommentPresentation
              key={comment.id}
              comment={comment}
              onReplyBlock={(blockId) => {
                onReplyBlock(comment.id, blockId)
              }}
            />
          )
        })}
      </YStack>
    </>
  )
}

export function EntityCommentsAccessory({
  id,
  activeVersion,
}: {
  id: UnpackedHypermediaId
  activeVersion: string
}) {
  const navigate = useNavigate()
  const commentGroups = useDocumentCommentGroups(id.eid)
  const createComment = trpc.comments.createCommentDraft.useMutation()
  return (
    <AccessoryContainer
      title="Comments"
      footer={
        <YStack padding="$4" borderTopWidth={1} borderColor="$borderColor">
          <Button
            size="$3"
            icon={Pencil}
            onPress={() => {
              createComment
                .mutateAsync({
                  targetDocEid: id.eid,
                  targetDocVersion: activeVersion,
                  targetCommentId: null,
                })
                .then((commentId) => {
                  navigate({
                    key: 'comment-draft',
                    commentId,
                  })
                })
            }}
          >
            Write a Comment
          </Button>
        </YStack>
      }
    >
      <YStack gap="$5" paddingBottom="$4">
        {commentGroups.map((group) => (
          <CommentGroup
            group={group}
            key={group.id}
            targetDocEid={id.eid}
            targetDocVersion={activeVersion}
          />
        ))}
      </YStack>
    </AccessoryContainer>
  )
}

export function CommentPresentation({
  comment,
  menuItems,
  onReplyBlock,
}: {
  comment: HMComment
  menuItems?: (MenuItemType | null)[]
  onReplyBlock?: (blockId: string) => void
}) {
  const account = useAccount_deprecated(comment.author)

  return (
    <YStack group="item" marginVertical="$3" paddingHorizontal="$3">
      <XStack jc="space-between" paddingHorizontal="$2" marginBottom="$2">
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
        {menuItems ? (
          <OptionsDropdown menuItems={menuItems || []} hiddenUntilItemHover />
        ) : null}
      </XStack>
      {comment.createTime ? (
        <XStack paddingHorizontal="$2" paddingLeft={34}>
          <SizableText fontSize="$2" color="$color8">
            {formattedDateMedium(comment.createTime)}
          </SizableText>
        </XStack>
      ) : null}
      <YStack paddingHorizontal="$2" paddingLeft={28}>
        <AppDocContentProvider
          comment
          onReplyBlock={onReplyBlock}
          onCopyBlock={(
            blockId: string,
            blockRange: BlockRange | ExpandedBlockRange | undefined,
          ) => {
            const url = `${comment.id}#${blockId}${serializeBlockRange(
              blockRange,
            )}`
            copyUrlToClipboardWithFeedback(url, 'Comment Block')
          }}
        >
          <BlocksContent blocks={comment.content} parentBlockId={null} />
        </AppDocContentProvider>
      </YStack>
    </YStack>
  )
}

export function CommentPageTitlebar({
  icon,
  children,
}: {
  icon?: React.ReactNode
  children?: React.ReactNode
}) {
  const {platform} = useAppContext()
  const isWindowsLinux = platform !== 'darwin'
  return (
    <XStack
      height={40}
      borderBottomWidth={1}
      borderColor="$borderColor"
      ai="center"
      jc="center"
      paddingHorizontal="$2"
      className="window-drag"
    >
      {!isWindowsLinux ? <View width={100} height="100%" /> : null}
      <XStack ai="center" jc="flex-start" f={1} paddingHorizontal="$2">
        <XStack ai="center" gap="$2" width="100%">
          {icon || (
            <XStack
              ai="center"
              jc="center"
              flexGrow={0}
              flexShrink={0}
              paddingTop={3} // now the icons "feels" vertically aligned
            >
              <MessageSquare size={12} />
            </XStack>
          )}
          {children}
        </XStack>
      </XStack>
      {isWindowsLinux ? <WindowsLinuxWindowControls /> : null}
    </XStack>
  )
}

export function CommentPageTitlebarWithDocId({
  targetDocId,
  targetDocIdStream,
}: {
  targetDocId?: string | null
  targetDocIdStream?: StateStream<string | null>
}) {
  const docId = useStream<string | null>(targetDocIdStream)
  const usableDocId = targetDocId || docId || undefined
  const doc = useDocument(usableDocId)
  const spawn = useNavigate('spawn')
  const author = doc.data?.author
  const title = getDocumentTitle(doc.data)
  if (!doc || !author || !title || !usableDocId)
    return (
      <CommentPageTitlebar>
        <Text fontSize="$4">Comment</Text>
      </CommentPageTitlebar>
    )
  return (
    <CommentPageTitlebar>
      <Text fontSize="$4" numberOfLines={1}>
        Comment on{' '}
        <ButtonText
          size="$4"
          fontSize="$4"
          className="no-window-drag"
          textDecorationLine="underline"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          width="100%"
          overflow="hidden"
          onPress={() => {
            spawn({
              key: 'document',
              documentId: usableDocId,
              versionId: doc.data?.version,
            })
          }}
        >
          {title}
        </ButtonText>
      </Text>
    </CommentPageTitlebar>
  )
}
