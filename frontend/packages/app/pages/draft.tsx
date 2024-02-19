import Footer from '@mintter/app/components/footer'
import {useNavRoute} from '@mintter/app/utils/navigation'
import {trpc} from '@mintter/desktop/src/trpc'
import {
  BlockNoteEditor,
  HMEditorContainer,
  HyperMediaEditorView,
} from '@mintter/editor'
import {
  StateStream,
  blockStyles,
  createPublicWebHmUrl,
  formattedDateMedium,
  unpackDocId,
  useHeadingMarginStyles,
  useHeadingTextStyles,
  usePublicationContentContext,
} from '@mintter/shared'
import {
  Button,
  ErrorIcon,
  Input,
  SizableText,
  Theme,
  XStack,
  YStack,
  copyUrlToClipboardWithFeedback,
  useStream,
} from '@mintter/ui'
import {Selection} from '@tiptap/pm/state'
import {useSelector} from '@xstate/react'
import {useEffect, useRef, useState} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {ActorRefFrom} from 'xstate'
import {MainWrapper} from '../components/main-wrapper'
import {useDraftEditor} from '../models/documents'
import {DraftStatusContext, draftMachine} from '../models/draft-machine'
import {useHasDevTools} from '../models/experiments'
import {useGatewayUrl} from '../models/gateway-settings'
import {
  chromiumSupportedImageMimeTypes,
  chromiumSupportedVideoMimeTypes,
  generateBlockId,
  getBlockInfoFromPos,
  handleDragMedia,
} from '../utils/media-drag'
import {useOpenDraft} from '../utils/open-draft'
import {AppPublicationContentProvider} from './publication-content-provider'

export default function DraftPage() {
  let route = useNavRoute()
  if (route.key != 'draft') throw new Error('DraftPage must have draft route')

  const openDraft = useOpenDraft('replace')
  const documentId = route.draftId! // TODO, clean this up when draftId != docId
  const hasCreatedDraft = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  useEffect(() => {
    if (documentId === undefined) {
      if (hasCreatedDraft.current) return
      openDraft()
      hasCreatedDraft.current = true
    }
  }, [documentId])

  const isSaved = DraftStatusContext.useSelector((s) => s.matches('saved'))

  let data = useDraftEditor({
    documentId: route.draftId,
    route,
  })

  useEffect(() => {
    function handleSelectAll(event: KeyboardEvent) {
      if (event.key == 'a' && event.metaKey) {
        if (data.editor) {
          event.preventDefault()
          data.editor._tiptapEditor.commands.focus()
          data.editor._tiptapEditor.commands.selectAll()
        }
      }
    }

    window.addEventListener('keydown', handleSelectAll)

    return () => {
      window.removeEventListener('keydown', handleSelectAll)
    }
  }, [])

  const gwUrl = useGatewayUrl()

  function handleFocusAtMousePos(event) {
    let ttEditor = (data.editor as BlockNoteEditor)._tiptapEditor
    let editorView = ttEditor.view
    let editorRect = editorView.dom.getBoundingClientRect()
    let centerEditor = editorRect.left + editorRect.width / 2

    const pos = editorView.posAtCoords({
      left: editorRect.left + 1,
      top: event.clientY + editorView.dom.offsetTop,
    })

    if (pos) {
      let node = editorView.state.doc.nodeAt(pos.pos)

      let sel = Selection.near(
        editorView.state.doc.resolve(
          event.clientX < centerEditor ? pos.pos : pos.pos + node.nodeSize - 1,
        ),
      )

      ttEditor.commands.focus()
      ttEditor.commands.setTextSelection(sel)
    } else {
      if (event.clientY > editorRect.top) {
        // this is needed because if the user clicks on one of the sides of the title we don't want to jump to the bottom of the document to focus the document.
        // if the window is scrolled and the title is not visible this will not matter because a block will be at its place so the normal focus should work.
        ttEditor.commands.focus()
        ttEditor.commands.setTextSelection(ttEditor.state.doc.nodeSize)
      }
    }
  }

  if (data.state.matches('ready')) {
    return (
      <ErrorBoundary
        FallbackComponent={DraftError}
        onReset={() => window.location.reload()}
      >
        <MainWrapper
          onPress={handleFocusAtMousePos}
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
              const ttEditor = (data.editor as BlockNoteEditor)._tiptapEditor
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

                          const {state} = ttEditor.view
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
                            ;(data.editor as BlockNoteEditor).insertBlocks(
                              [blockNode],
                              blockInfo.id,
                              blockInfo.node.textContent ? 'after' : 'before',
                            )
                          } else {
                            ;(data.editor as BlockNoteEditor).insertBlocks(
                              [blockNode],
                              lastId,
                              'after',
                            )
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
          <AppPublicationContentProvider
            disableEmbedClick
            onCopyBlock={(blockId: string) => {
              if (route.key != 'draft')
                throw new Error('DraftPage must have draft route')
              if (!route.draftId)
                throw new Error('draft route draftId is missing')
              const id = unpackDocId(route.draftId)
              if (!id?.eid)
                throw new Error('eid could not be extracted from draft route')
              copyUrlToClipboardWithFeedback(
                createPublicWebHmUrl('d', id.eid, {
                  blockRef: blockId,
                  hostname: gwUrl.data,
                }),
                'Block',
              )
            }}
          >
            {data.state.matches({ready: 'saveError'}) ? (
              <Theme name="red">
                <XStack padding="$4" position="sticky" top={0} zIndex={100}>
                  <XStack
                    flex={1}
                    paddingHorizontal="$4"
                    paddingVertical="$2"
                    borderRadius="$3"
                    backgroundColor="$backgroundFocus"
                    alignItems="center"
                    gap="$4"
                    borderColor="$color6"
                    borderWidth={1}
                  >
                    <ErrorIcon size={12} />
                    <XStack flex={1}>
                      <SizableText>
                        Your draft is in a corrupt state. Need to restore or
                        reset
                      </SizableText>
                    </XStack>
                    <XStack gap="$2" ai="center">
                      {data.state.context.restoreTries == 0 ? (
                        <Button
                          size="$2"
                          theme="red"
                          onPress={() => data.send({type: 'RESTORE.DRAFT'})}
                        >
                          restore
                        </Button>
                      ) : (
                        <SizableText size="$2" fontWeight="600">
                          Restore failed
                        </SizableText>
                      )}

                      <Button
                        size="$2"
                        theme="red"
                        onPress={() => data.send({type: 'RESET.DRAFT'})}
                      >
                        reset
                      </Button>
                    </XStack>
                  </XStack>
                </XStack>
              </Theme>
            ) : null}
            <YStack
              id="editor-title"
              onPress={(e) => {
                e.stopPropagation()
              }}
              // style={{border: '1px solid green'}}
            >
              <DraftTitleInput
                draftActor={data.actor}
                onEnter={() => {
                  data.editor?._tiptapEditor?.commands?.focus?.('start')
                }}
              />
            </YStack>
            <HMEditorContainer>
              {data.state.context.draft &&
              data.editor &&
              data.editor.topLevelBlocks.length ? (
                <HyperMediaEditorView
                  editable={!data.state.matches({ready: 'saveError'})}
                  editor={data.editor}
                />
              ) : null}
            </HMEditorContainer>
          </AppPublicationContentProvider>
          {documentId ? (
            <DraftDevTools
              draftId={documentId}
              editorState={data.editorStream}
            />
          ) : null}
        </MainWrapper>
        <Footer>
          <XStack gap="$3" marginHorizontal="$3">
            {data.draft?.updateTime && (
              <SizableText size="$1" color={isSaved ? '$color' : '$color9'}>
                Last update: {formattedDateMedium(data.draft.updateTime)}
              </SizableText>
            )}
          </XStack>
        </Footer>
      </ErrorBoundary>
    )
  }

  if (data.state.matches('error')) {
    return (
      <MainWrapper>
        <XStack jc="center" ai="center" f={1} backgroundColor={'$color2'}>
          <YStack
            space
            theme="red"
            backgroundColor="$color1"
            maxWidth={500}
            marginVertical="$7"
            padding="$4"
            f={1}
            borderRadius="$4"
          >
            <SizableText size="$5" fontWeight="bold" color="$red10">
              Sorry, this drafts appears to be corrupt
            </SizableText>

            <SizableText size="$2">
              Well, this is embarrasing. for some reason we are not able to load
              this draft due to a internal problem in the draft changes. TODO.
            </SizableText>

            <XStack jc="center">
              <Button
                size="$2"
                onPress={() => {
                  data.send({type: 'RESET.CORRUPT.DRAFT'})
                }}
              >
                Reset Draft
              </Button>
            </XStack>
          </YStack>
        </XStack>
      </MainWrapper>
    )
  }

  // console.log('=== DATA', data.state.value)

  // if (data.state.matches('waiting')) {
  //   return <DocumentPlaceholder />
  // }

  return null
}

function applyTitleResize(target: HTMLTextAreaElement) {
  // without this, the scrollHeight doesn't shrink, so when the user deletes a long title it doesnt shrink back
  target.style.height = ''

  // here is the actual auto-resize
  target.style.height = `${target.scrollHeight}px`
}

function DraftTitleInput({
  onEnter,
  draftActor,
}: {
  onEnter: () => void
  draftActor: ActorRefFrom<typeof draftMachine>
}) {
  const {textUnit, layoutUnit} = usePublicationContentContext()
  let headingTextStyles = useHeadingTextStyles(1, textUnit)
  const title = useSelector(draftActor, (s) => s.context.title || '')

  const input = useRef<HTMLTextAreaElement | null>(null)
  const headingMarginStyles = useHeadingMarginStyles(2, layoutUnit)

  useEffect(() => {
    // handle the initial size of the title
    const target = input.current
    if (!target) return
    applyTitleResize(target)
  }, [])

  useEffect(() => {
    const target = input.current
    if (!target) return
    if (target.value !== title) {
      // handle cases where the model has a different title. this happens when pasting multiline text into the title
      target.value = title || ''
      applyTitleResize(target)
    }
  }, [title])

  useEffect(() => {
    function handleResize() {
      // handle the resize size of the title, responsive size may be changed
      const target = input.current
      if (!target) return
      applyTitleResize(target)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <XStack
      {...blockStyles}
      marginBottom={layoutUnit}
      paddingBottom={layoutUnit / 2}
      borderBottomColor="$color6"
      borderBottomWidth={1}
      paddingHorizontal={54}
      {...headingMarginStyles}
    >
      <Input
        // we use multiline so that we can avoid horizontal scrolling for long titles
        multiline
        // @ts-expect-error this will only work on web, where multiline TextInput is a HTMLTextAreaElement
        ref={input}
        onKeyPress={(e) => {
          if (e.nativeEvent.key == 'Enter') {
            e.preventDefault()
            onEnter()
          }
        }}
        size="$9"
        borderRadius="$1"
        borderWidth={0}
        overflow="hidden" // trying to hide extra content that flashes when pasting multi-line text into the title
        flex={1}
        backgroundColor="$color2"
        fontWeight="bold"
        fontFamily="$body"
        onChange={(e) => {
          // @ts-expect-error
          applyTitleResize(e.target as HTMLTextAreaElement)
        }}
        outlineColor="transparent"
        borderColor="transparent"
        paddingLeft={9.6}
        defaultValue={title?.trim() || ''} // this is still a controlled input because of the value comparison in useLayoutEffect
        // value={title}
        onChangeText={(title) => {
          // TODO: change title here
          draftActor.send({type: 'CHANGE', title})
        }}
        placeholder="Untitled Document"
        {...headingTextStyles}
        padding={0}
      />
    </XStack>
  )
}

function DraftDevTools({
  draftId,
  editorState,
}: {
  draftId: string
  editorState: StateStream<any>
}) {
  const hasDevTools = useHasDevTools()
  const openDraft = trpc.diagnosis.openDraftLog.useMutation()
  const [debugValue, setShowValue] = useState(false)
  const editorValue = useStream(editorState)
  if (!hasDevTools) return null
  return (
    <YStack alignSelf="stretch">
      <XStack space="$4" margin="$4">
        <Button
          size="$2"
          theme="orange"
          onPress={() => {
            openDraft.mutate(draftId)
          }}
        >
          Open Draft Log
        </Button>
        <Button
          theme="orange"
          size="$2"
          onPress={() => setShowValue((v) => !v)}
        >
          {debugValue ? 'Hide Draft Value' : 'Show Draft Value'}
        </Button>
      </XStack>
      {debugValue && (
        <code style={{whiteSpace: 'pre-wrap'}}>
          {JSON.stringify(editorValue, null, 2)}
        </code>
      )}
    </YStack>
  )
}

function DraftError({
  documentId,
  error,
  resetErrorBoundary,
}: FallbackProps & {documentId: string}) {
  return (
    <Theme name="red">
      <YStack
        marginVertical="$8"
        padding="$4"
        borderRadius="$5"
        borderColor="$color5"
        borderWidth={2}
        backgroundColor="$color3"
        gap="$3"
        alignItems="center"
      >
        <SizableText size="$4" textAlign="center" color="$color9">
          Error loading Draft (Document Id: {documentId})
        </SizableText>
        <SizableText color="$color8" size="$2" fontFamily="$mono">
          {JSON.stringify(error)}
        </SizableText>
        <Button size="$3" onPress={() => resetErrorBoundary()}>
          Retry
        </Button>
      </YStack>
    </Theme>
  )
}
