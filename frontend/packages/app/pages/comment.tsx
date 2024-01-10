import {trpc} from '@mintter/desktop/src/trpc'
import {
  HMComment,
  createHmId,
  createPublicWebHmUrl,
  unpackHmId,
} from '@mintter/shared'
import {Button, ChevronUp, Copy, Spinner, XStack, YStack} from '@mintter/ui'
import {Reply} from '@tamagui/lucide-icons'
import {
  CommentGroup,
  CommentPageTitlebarWithDocId,
  CommentPresentation,
  CommentThread,
} from '../components/comments'
import {MainWrapperStandalone} from '../components/main-wrapper'
import {copyUrlToClipboardWithFeedback} from '../copy-to-clipboard'
import {useComment, usePublicationCommentGroups} from '../models/comments'
import {useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'

function MainComment({
  comment,
  onReplyBlock,
}: {
  comment: HMComment
  onReplyBlock: (blockId: string) => void
}) {
  const route = useNavRoute()
  const createComment = trpc.comments.createCommentDraft.useMutation()
  const replace = useNavigate('replace')
  const navigate = useNavigate()
  if (route.key !== 'comment') throw new Error('Invalid route for CommentPage')
  const targetDocId = comment?.target ? unpackHmId(comment?.target) : null
  const commentGroups = usePublicationCommentGroups(
    targetDocId?.eid,
    comment.id,
  )
  return (
    <>
      <YStack borderBottomWidth={1} borderColor="$borderColor">
        <CommentPresentation
          comment={comment}
          onReplyBlock={onReplyBlock}
          menuItems={[
            {
              key: 'copyLink',
              label: 'Copy Link',
              icon: Copy,
              onPress: () => {
                copyUrlToClipboardWithFeedback(
                  createPublicWebHmUrl('c', comment.id),
                  'Comment',
                )
              },
            },
            {
              key: 'reply',
              label: 'Reply',
              icon: Reply,
              onPress: () => {
                createComment
                  .mutateAsync({
                    targetDocEid: comment.targetDocEid,
                    targetDocVersion: 'ohcrap.idk',
                    targetCommentId: comment.id,
                  })
                  .then((commentId) => {
                    navigate({
                      key: 'comment-draft',
                      commentId,
                    })
                  })
              },
            },
          ]}
        />
      </YStack>
      <YStack paddingVertical="$4">
        {commentGroups.length && targetDocId ? (
          commentGroups.map((group) => (
            <CommentGroup
              group={group}
              key={group.id}
              targetDocEid={targetDocId.eid}
              targetDocVersion={targetDocId.version}
            />
          ))
        ) : (
          <XStack paddingHorizontal="$6" paddingVertical="$4">
            <Button
              size="$2"
              icon={Reply}
              onPress={() => {
                const targetDocId = unpackHmId(comment.target)
                if (!targetDocId) throw new Error('Invalid comment.target')
                console.log('== createComment', comment, targetDocId)
                createComment
                  .mutateAsync({
                    targetDocEid: targetDocId.eid,
                    targetDocVersion: targetDocId.version,
                    targetCommentId: comment.id,
                  })
                  .then((draftId) => {
                    replace({
                      key: 'comment-draft',
                      commentId: draftId,
                    })
                  })
              }}
            >
              Reply
            </Button>
          </XStack>
        )}
      </YStack>
    </>
  )
}

export default function CommentPage() {
  const route = useNavRoute()
  const replace = useNavigate('replace')
  if (route.key !== 'comment') throw new Error('Invalid route for CommentPage')
  const commentId = route.commentId
  if (!commentId) throw new Error('Invalid route commentId')
  const comment = useComment(route.commentId)
  const createComment = trpc.comments.createCommentDraft.useMutation()
  function handleReplyBlock(replyBlockCommentId: string, blockId: string) {
    const commentId = unpackHmId(replyBlockCommentId)
    if (!commentId) throw new Error('Invalid commentId')
    const targetDocId = comment.data?.target
      ? unpackHmId(comment.data?.target)
      : null
    if (!targetDocId) throw new Error('Invalid comment.target')
    createComment
      .mutateAsync({
        targetDocEid: targetDocId.eid,
        targetDocVersion: targetDocId.version,
        targetCommentId: replyBlockCommentId,
        blocks: [
          {
            block: {
              type: 'embed',
              attributes: {},
              ref: createHmId('c', commentId.eid, {
                blockRef: blockId,
              }),
            },
            children: [],
          },
        ],
      })
      .then((commentId) => {
        replace({
          key: 'comment-draft',
          commentId,
        })
      })
  }
  const targetDocId = comment.data?.target
    ? unpackHmId(comment.data?.target)
    : null
  return (
    <>
      <CommentPageTitlebarWithDocId targetDocId={targetDocId?.qid} />
      <MainWrapperStandalone backgroundColor={'$blue2'} theme="blue">
        {comment.isLoading ? <Spinner /> : null}
        {route.showThread && targetDocId && comment.data?.repliedComment ? (
          <CommentThread
            targetCommentId={comment.data?.repliedComment}
            targetDocEid={targetDocId.eid}
            onReplyBlock={handleReplyBlock}
          />
        ) : comment.data?.repliedComment ? (
          <XStack jc="center" marginHorizontal="$2">
            <Button
              onPress={() => {
                replace({...route, showThread: true})
              }}
              icon={ChevronUp}
              chromeless
              size="$1"
            >
              Show Thread
            </Button>
          </XStack>
        ) : null}
        {comment.data ? (
          <MainComment
            comment={comment.data}
            onReplyBlock={(blockId) => {
              handleReplyBlock(commentId, blockId)
            }}
          />
        ) : null}
      </MainWrapperStandalone>
    </>
  )
}
