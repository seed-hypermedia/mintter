// import 'show-keys'
import {ScrollArea} from '@app/components/scroll-area'
import {DraftActor} from '@app/draft-machine'
import {DragProvider} from '@app/drag-context'
import {createDragMachine} from '@app/drag-machine'
import {BlockHighLighter} from '@app/editor/block-highlighter'
import {Editor} from '@app/editor/editor'
import {FileProvider} from '@app/file-provider'
import {MouseProvider} from '@app/mouse-context'
import {mouseMachine} from '@app/mouse-machine'
import {AppError} from '@app/root'
import {Box} from '@components/box'
import Footer from '@components/footer'
import {Placeholder} from '@components/placeholder-box'
import {Text} from '@components/text'
import {ChildrenOf, Document, FlowContent, isFlowContent} from '@mintter/shared'
import {useActor, useInterpret} from '@xstate/react'
import React, {useEffect} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {
  Editor as SlateEditor,
  Path,
  Transforms,
  Node,
  NodeEntry,
  Descendant,
} from 'slate'
import {ReactEditor} from 'slate-react'

type DraftPageProps = {
  draftActor: DraftActor
  editor: SlateEditor
}

export default function DraftPage({draftActor, editor}: DraftPageProps) {
  const [state, send] = useActor(draftActor)
  let mouseService = useInterpret(() => mouseMachine)
  let dragService = useInterpret(() => createDragMachine(editor))

  // @ts-ignore
  window.mouseService = mouseService

  useInitialFocus(editor)

  // console.log('🚀 ~ file: draft.tsx:36 ~ DraftPage ~ state', state)

  // if (state.matches('errored')) {
  //   return <Text>ERROR: {state.context.errorMessage}</Text>
  // }

  if (state.matches('editing')) {
    return (
      <div
        data-testid="draft-wrapper"
        className="page-wrapper"
        onMouseMove={(event) => {
          mouseService.send({
            type: 'MOUSE.MOVE',
            position: event.clientY,
          })
          draftActor.send('EDITING.STOP')
        }}
        onMouseLeave={() => {
          mouseService.send('DISABLE.CHANGE')
        }}
        onMouseUp={() => {
          dragService.send('DROPPED')
          mouseService.send('DISABLE.DRAG.END')
        }}
        onDragOver={(e: React.DragEvent) => {
          e.preventDefault()
          const initialNode = e.target as Element
          if (initialNode && initialNode.nodeName === 'P') {
            const element = ReactEditor.toSlateNode(editor, initialNode)
            const path = ReactEditor.findPath(editor, element)

            const parentBlock = SlateEditor.above<FlowContent>(editor, {
              match: isFlowContent,
              mode: 'lowest',
              at: path,
            })

            if (parentBlock) {
              const [node, ancestorPath] = parentBlock

              const domNode = ReactEditor.toDOMNode(editor, node)

              dragService?.send({
                type: 'DRAG.OVER',
                toPath: ancestorPath,
                element: domNode as HTMLLIElement,
                currentPos: e.clientX,
              })
            }
          } else {
            dragService?.send({
              type: 'DRAG.OVER',
              toPath: null,
              element: null,
              currentPos: e.clientX,
            })
          }
        }}
      >
        <ErrorBoundary
          FallbackComponent={AppError}
          onReset={() => window.location.reload()}
        >
          <ScrollArea
            onScroll={() => {
              mouseService.send('DISABLE.SCROLL')

              // if (!canEdit) {
              //   mainService.send('NOT.EDITING')
              // }
            }}
          >
            <MouseProvider value={mouseService}>
              <DragProvider value={dragService}>
                <BlockHighLighter>
                  <FileProvider value={state.context.draft}>
                    {state.context.localDraft?.content ? (
                      <Editor
                        editor={editor}
                        value={state.context.localDraft.content}
                        //@ts-ignore
                        onChange={(content: ChildrenOf<Document>) => {
                          if (!content && typeof content == 'string') return
                          mouseService.send('DISABLE.CHANGE')
                          draftActor.send('EDITING.START')
                          send({type: 'DRAFT.UPDATE', payload: {content}})
                        }}
                      />
                    ) : null}
                    <Footer />
                  </FileProvider>
                </BlockHighLighter>
              </DragProvider>
            </MouseProvider>
          </ScrollArea>
        </ErrorBoundary>
      </div>
    )
  }

  return <DraftShell />
}

function useInitialFocus(editor: SlateEditor) {
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (editor.children.length == 0) return

      ReactEditor.focus(editor)
      Transforms.select(editor, SlateEditor.end(editor, []))

      if (ReactEditor.isFocused(editor)) {
        clearInterval(intervalId)
      }
    }, 10)
  }, [editor])
}

function DraftShell() {
  // TODO: update shell
  return (
    <Box
      css={{
        marginTop: '60px',
        width: '$full',
        maxWidth: '$prose-width',
        display: 'flex',
        flexDirection: 'column',
        gap: '$7',
        marginInline: 'auto',
      }}
    >
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
    </Box>
  )
}

function BlockPlaceholder() {
  return (
    <Box
      css={{
        width: '$prose-width',
        display: 'flex',
        flexDirection: 'column',
        gap: '$2',
      }}
    >
      <Placeholder css={{height: 16, width: '$full'}} />
      <Placeholder css={{height: 16, width: '92%'}} />
      <Placeholder css={{height: 16, width: '84%'}} />
      <Placeholder css={{height: 16, width: '90%'}} />
    </Box>
  )
}
