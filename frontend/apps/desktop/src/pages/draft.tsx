import {HMEditorContainer, HyperMediaEditorView} from '@/components/editor'
import {MainWrapper} from '@/components/main-wrapper'
import {BlockNoteEditor, getBlockInfoFromPos} from '@/editor'
import {useDraftEditor} from '@/models/documents'
import {draftMachine} from '@/models/draft-machine'
import {trpc} from '@/trpc'
import {
  chromiumSupportedImageMimeTypes,
  chromiumSupportedVideoMimeTypes,
  generateBlockId,
  handleDragMedia,
} from '@/utils/media-drag'
import {useNavRoute} from '@/utils/navigation'
import {
  BlockRange,
  blockStyles,
  createPublicWebHmUrl,
  ExpandedBlockRange,
  unpackDocId,
  useDocContentContext,
  useHeadingMarginStyles,
  useHeadingTextStyles,
} from '@shm/shared'
import {copyUrlToClipboardWithFeedback, Input, XStack} from '@shm/ui'
import {useSelector} from '@xstate/react'
import {useEffect, useRef, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {YStack} from 'tamagui'
import {ActorRefFrom} from 'xstate'
import {AppDocContentProvider} from './document-content-provider'
export default function DraftPage() {
  const route = useNavRoute()
  // const gwUwl = useGatewayUrl()
  const importWebFile = trpc.webImporting.importWebFile.useMutation()
  const [isDragging, setIsDragging] = useState(false)
  if (route.key != 'draft') throw new Error('DraftPage must have draft route')

  let data = useDraftEditor({
    id: route.id,
  })

  console.log(`== ~ DraftPage ~ data:`, data.state.value)

  useEffect(() => {
    if (data.state) {
      window.state = data.state
    }
  }, [data.state])

  if (data.state.matches('ready')) {
    return (
      <ErrorBoundary FallbackComponent={() => null}>
        <MainWrapper
          onDragStart={() => {
            setIsDragging(true)
          }}
          onDragEnd={() => {
            setIsDragging(false)
          }}
          onDragOver={(event: DragEvent) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDrop={onDrop}
          onPress={data.handleFocusAtMousePos}
        >
          <AppDocContentProvider
            disableEmbedClick
            onCopyBlock={onCopyBlock}
            importWebFile={importWebFile}
          >
            <YStack
              id="editor-title"
              // @ts-expect-error
              onPress={(e) => {
                e.stopPropagation()
              }}
            >
              <DraftTitleInput
                draftActor={data.actor}
                onEnter={() => {}}
                disabled={!data.state.matches('ready')}
              />
            </YStack>
            <HMEditorContainer>
              {data.editor ? (
                <HyperMediaEditorView editable={true} editor={data.editor} />
              ) : null}
            </HMEditorContainer>
          </AppDocContentProvider>
        </MainWrapper>
      </ErrorBoundary>
    )
  }

  return null

  // ==========

  function onDrop(event: DragEvent) {
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
          // @ts-expect-error
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
                  } else if (chromiumSupportedVideoMimeTypes.has(file.type)) {
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

                  const blockInfo = getBlockInfoFromPos(state.doc, pos.pos)

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
        // .then(() => true) // TODO: @horacio ask Iskak about this
        setIsDragging(false)
        return true
      }
      setIsDragging(false)
      return false
    }
    setIsDragging(false)

    return false
  }

  function onCopyBlock(
    blockId: string,
    blockRange: BlockRange | ExpandedBlockRange | undefined,
  ) {
    if (route.key != 'draft') throw new Error('DraftPage must have draft route')
    if (!route.draftId) throw new Error('draft route draftId is missing')
    const id = unpackDocId(route.draftId)
    if (!id?.eid) throw new Error('eid could not be extracted from draft route')
    copyUrlToClipboardWithFeedback(
      createPublicWebHmUrl('d', id.eid, {
        blockRef: blockId,
        blockRange,
        hostname: gwUrl.data,
      }),
      'Block',
    )
  }
}

export function DraftTitleInput({
  onEnter,
  draftActor,
  disabled = false,
}: {
  onEnter: () => void
  draftActor: ActorRefFrom<typeof draftMachine>
  disabled?: boolean
}) {
  const {textUnit, layoutUnit} = useDocContentContext()
  let headingTextStyles = useHeadingTextStyles(1, textUnit)
  const title = useSelector(
    draftActor,
    (s) => s.context.title || s.context.draft?.metadata.title || '',
  )
  const input = useRef<HTMLTextAreaElement | null>(null)
  const headingMarginStyles = useHeadingMarginStyles(2, layoutUnit)

  useEffect(() => {
    // handle the initial size of the title
    const target = input.current
    if (!target) return
    applyTitleResize(target)
  }, [input.current])

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
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }

    function handleResize() {
      // handle the resize size of the title, responsive size may be changed
      const target = input.current
      if (!target) return
      applyTitleResize(target)
    }
  }, [input.current])

  return (
    <XStack
      flex="none"
      {...blockStyles}
      marginBottom={layoutUnit}
      paddingBottom={layoutUnit / 2}
      borderBottomColor="$color6"
      borderBottomWidth={1}
      paddingHorizontal={54}
      {...headingMarginStyles}
    >
      <Input
        disabled={disabled}
        // we use multiline so that we can avoid horizontal scrolling for long titles
        multiline
        ref={input}
        onKeyPress={(e: any) => {
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
        onChange={(e: any) => {
          applyTitleResize(e.target as HTMLTextAreaElement)
        }}
        outlineColor="transparent"
        borderColor="transparent"
        paddingLeft={9.6}
        defaultValue={title?.trim() || ''} // this is still a controlled input because of the value comparison in useLayoutEffect
        // value={title}
        onChangeText={(title: string) => {
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

function applyTitleResize(target: HTMLTextAreaElement) {
  // without this, the scrollHeight doesn't shrink, so when the user deletes a long title it doesnt shrink back
  target.style.height = ''

  // here is the actual auto-resize
  target.style.height = `${target.scrollHeight}px`
}
