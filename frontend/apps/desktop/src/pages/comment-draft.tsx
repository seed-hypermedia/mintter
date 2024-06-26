import { getBlockInfoFromPos } from '@/editor'
import { StateStream, unpackHmId } from '@shm/shared'
import { Button, ChevronUp, SizableText, YStack, useStream } from '@shm/ui'

import {
  CommentPageTitlebarWithDocId,
  CommentPresentation,
  CommentThread,
} from '@/components/comments'
import { useDeleteCommentDraftDialog } from '@/components/delete-comment-draft-dialog'
import { MainWrapperStandalone } from '@/components/main-wrapper'
import { useComment, useCommentEditor } from '@/models/comments'
import {
  chromiumSupportedImageMimeTypes,
  chromiumSupportedVideoMimeTypes,
  generateBlockId,
  handleDragMedia,
} from '@/utils/media-drag'
import { useEffect, useState } from 'react'
import { XStack } from 'tamagui'

import { useNavRoute } from '@/utils/navigation'
import { useNavigate } from '@/utils/useNavigate'
import { HMEditorContainer, HyperMediaEditorView } from 'src/components/editor'
import './comment-draft.css'
import { AppDocContentProvider } from './document-content-provider'

function CommitBar({
  onSubmit,
  onDiscard,
  isSaved,
  targetCommentId,
}: {
  onSubmit: () => void
  onDiscard: () => void
  isSaved: StateStream<boolean>
  targetCommentId: StateStream<string | null>
}) {
  const _isSaved = useStream(isSaved)
  const _targetCommentId = useStream(targetCommentId)
  return (
    <XStack
      ai="center"
      padding="$4"
      paddingHorizontal="$5"
      theme="blue"
      jc="space-between"
      borderTopWidth={1}
      borderColor="$borderColor"
    >
      <Button size="$2" onPress={onDiscard}>
        Discard Draft
      </Button>
      <Button
        className="no-window-drag"
        disabled={!_isSaved}
        onPress={onSubmit}
        size="$2"
        theme="green"
      >
        {_targetCommentId ? 'Submit Reply' : 'Submit Comment'}
      </Button>
    </XStack>
  )
}

function TargetComment({
  targetCommentId,
  onReplyBlock,
}: {
  targetCommentId: StateStream<string | null>
  onReplyBlock: (commentId: string, blockId: string) => void
}) {
  const route = useNavRoute()
  if (route.key !== 'comment-draft')
    throw new Error('Invalid route for CommentDraftPage')
  const replace = useNavigate('replace')
  const _targetCommentId = useStream(targetCommentId)
  const comment = useComment(_targetCommentId)
  if (!_targetCommentId) return null
  const targetDocId = comment.data?.target
    ? unpackHmId(comment.data?.target)
    : null
  if (!targetDocId) return null
  return (
    <YStack
      borderBottomWidth={1}
      borderColor="$borderColor"
      marginHorizontal={14}
    >
      <SizableText size="$2" color="$color8" margin="$2" marginHorizontal="$4">
        Replying to:
      </SizableText>
      {route.showThread && comment.data?.repliedComment ? (
        <CommentThread
          targetCommentId={comment.data?.repliedComment}
          targetDocEid={targetDocId.eid}
          onReplyBlock={onReplyBlock}
        />
      ) : comment.data?.repliedComment ? (
        <XStack jc="center">
          <Button
            onPress={() => {
              replace({ ...route, showThread: true })
            }}
            icon={ChevronUp}
            chromeless
            size="$1"
            marginHorizontal="$4"
          >
            Show Thread
          </Button>
        </XStack>
      ) : null}
      {comment.data && (
        <CommentPresentation
          comment={comment.data}
          onReplyBlock={(blockId) => onReplyBlock(_targetCommentId, blockId)}
        />
      )}
    </YStack>
  )
}

export default function CommentDraftPage() {
  const route = useNavRoute()
  if (route.key !== 'comment-draft')
    throw new Error('Invalid route for CommentDraftPage')

  const {
    editor,
    onSubmit,
    onDiscard,
    isSaved,
    targetCommentId,
    targetDocId,
    addReplyEmbed,
  } = useCommentEditor({
    onDiscard: () => {
      window.close()
    },
  })
  useEffect(() => {
    editor._tiptapEditor.commands.focus()
  }, [])
  const [isDragging, setIsDragging] = useState(false)
  const discardComment = useDeleteCommentDraftDialog()
  return (
    <>
      <CommentPageTitlebarWithDocId targetDocIdStream={targetDocId} />
      <MainWrapperStandalone
        // @ts-ignore
        onDragStart={(event) => {
          setIsDragging(true)
        }}
        onDragEnd={(event) => {
          setIsDragging(false)
        }}
        onDragOver={(event) => {
          setIsDragging(true)
          event.preventDefault()
        }}
        onDrop={(event: DragEvent) => {
          if (!isDragging) return
          const dataTransfer = event.dataTransfer

          if (dataTransfer) {
            const ttEditor = editor._tiptapEditor
            const files: File[] = []

            if (dataTransfer.files.length) {
              for (let i = 0; i < dataTransfer.files.length; i++) {
                files.push(dataTransfer.files[i])
              }
            } else if (dataTransfer.items.length) {
              for (let i = 0; i < dataTransfer.items.length; i++) {
                const item = dataTransfer.items[i].getAsFile()
                if (item) {
                  files.push(item)
                }
              }
            }

            if (files.length > 0) {
              const editorElement = document.getElementsByClassName(
                'mantine-Editor-root',
              )[0]
              const editorBoundingBox = editorElement.getBoundingClientRect()
              const pos = ttEditor.view.posAtCoords({
                left: editorBoundingBox.left + editorBoundingBox.width / 2,
                top: event.clientY,
              })

              let lastId: string

              // using reduce so files get inserted sequentially
              files
                .reduce((previousPromise, file, index) => {
                  return previousPromise.then(() => {
                    event.preventDefault()
                    event.stopPropagation()

                    if (pos && pos.inside !== -1) {
                      return handleDragMedia(file).then((props) => {
                        if (!props) return false

                        const { state } = ttEditor.view
                        let blockNode
                        const newId = generateBlockId()

                        if (chromiumSupportedImageMimeTypes.has(file.type)) {
                          blockNode = {
                            id: newId,
                            type: 'image',
                            props: {
                              url: props.url,
                              name: props.name,
                            },
                          }
                        } else if (
                          chromiumSupportedVideoMimeTypes.has(file.type)
                        ) {
                          blockNode = {
                            id: newId,
                            type: 'video',
                            props: {
                              url: props.url,
                              name: props.name,
                            },
                          }
                        } else {
                          blockNode = {
                            id: newId,
                            type: 'file',
                            props: {
                              ...props,
                            },
                          }
                        }

                        const blockInfo = getBlockInfoFromPos(
                          state.doc,
                          pos.pos,
                        )

                        if (index === 0) {
                          editor.insertBlocks(
                            [blockNode],
                            blockInfo.id,
                            blockInfo.node.textContent ? 'after' : 'before',
                          )
                        } else {
                          editor.insertBlocks([blockNode], lastId, 'after')
                        }

                        lastId = newId
                      })
                    }
                  })
                }, Promise.resolve())
                .then(() => true)
              setIsDragging(false)
              return true
            }
            setIsDragging(false)
            return false
          }
          setIsDragging(false)

          return false
        }}
      >
        <YStack minHeight={'100vh'}>
          <TargetComment
            targetCommentId={targetCommentId}
            onReplyBlock={addReplyEmbed}
          />
          <YStack
            f={1}
            className="comment-draft"
            onPress={() => {
              editor._tiptapEditor.commands.focus()
            }}
          >
            <AppDocContentProvider disableEmbedClick>
              <HMEditorContainer>
                <HyperMediaEditorView editor={editor} editable />
              </HMEditorContainer>
            </AppDocContentProvider>
          </YStack>
        </YStack>
      </MainWrapperStandalone>
      <CommitBar
        isSaved={isSaved}
        onSubmit={onSubmit}
        onDiscard={() => discardComment.open({ onConfirm: onDiscard })}
        targetCommentId={targetCommentId}
      />
      {discardComment.content}
    </>
  )
}
