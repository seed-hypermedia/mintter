import {HMEditorContainer, HyperMediaEditorView} from '@/components/editor'
import {MainWrapper} from '@/components/main-wrapper'
import {BlockNoteEditor, getBlockInfoFromPos} from '@/editor'
import {useDraft, useDraftEditor} from '@/models/documents'
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
  createPublicWebHmUrl,
  ExpandedBlockRange,
  unpackDocId,
} from '@shm/shared'
import {copyUrlToClipboardWithFeedback, SizableText} from '@shm/ui'
import {useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {YStack} from 'tamagui'
import {AppDocContentProvider} from './document-content-provider'
export default function DraftPage() {
  const route = useNavRoute()
  // const gwUwl = useGatewayUrl()
  const importWebFile = trpc.webImporting.importWebFile.useMutation()
  const [isDragging, setIsDragging] = useState(false)
  if (route.key != 'draft') throw new Error('DraftPage must have draft route')

  const draft = useDraft({draftId: route.id})

  let data = useDraftEditor({
    id: route.id,
  })

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
              <SizableText>Editor title</SizableText>
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
