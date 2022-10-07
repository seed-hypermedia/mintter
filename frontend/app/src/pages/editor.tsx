// import 'show-keys'
import {Document} from '@app/client'
import {BlockHighLighter} from '@app/editor/block-highlighter'
import {Blocktools} from '@app/editor/blocktools'
import {Editor} from '@app/editor/editor'
import {FileProvider} from '@app/file-provider'
import {useCurrentFile} from '@app/main-context'
import {DraftRef} from '@app/main-machine'
import {MouseProvider} from '@app/mouse-context'
import {mouseMachine} from '@app/mouse-machine'
import {ChildrenOf} from '@app/mttast'
import {MainWindow} from '@app/pages/window-components'
import {AppError} from '@app/root'
import {Text} from '@components/text'
import {useActor, useInterpret} from '@xstate/react'
import {useEffect} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Editor as SlateEditor, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'

export type EditorPageProps = {
  editor?: SlateEditor
  shouldAutosave?: boolean
  draftRef: DraftRef
}

export function useDraft(ref: DraftRef) {
  useEffect(() => {
    ref.send('LOAD')
    return () => {
      ref?.send('UNLOAD')
    }
  }, [ref])

  return useActor(ref)
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

export default function DraftWrapper() {
  let file = useCurrentFile()

  if (file) {
    return <EditorPage draftRef={file as DraftRef} />
  }

  return null
}

export function EditorPage({draftRef}: EditorPageProps) {
  const [state, send] = useDraft(draftRef)
  const {context} = state
  const mouseService = useInterpret(() => mouseMachine)
  useInitialFocus(context.editor)

  if (state.matches('errored')) {
    return <Text>ERROR: {context.errorMessage}</Text>
  }

  if (state.matches('editing')) {
    return (
      <ErrorBoundary
        FallbackComponent={AppError}
        onReset={() => window.location.reload()}
      >
        <MainWindow
          onMouseMove={(event) =>
            mouseService.send({type: 'MOUSE.MOVE', position: event.clientY})
          }
          onScroll={() => mouseService.send('DISABLE.SCROLL')}
        >
          {context.localDraft?.content && (
            <>
              <MouseProvider value={mouseService}>
                <BlockHighLighter>
                  <FileProvider value={draftRef}>
                    <Blocktools>
                      <Editor
                        editor={state.context.editor}
                        value={context.localDraft.content}
                        //@ts-ignore
                        onChange={(content: ChildrenOf<Document>) => {
                          if (!content && typeof content == 'string') return
                          mouseService.send('DISABLE.CHANGE')
                          send({type: 'DRAFT.UPDATE', payload: {content}})
                        }}
                      />
                    </Blocktools>
                  </FileProvider>
                </BlockHighLighter>
              </MouseProvider>
            </>
          )}
        </MainWindow>
      </ErrorBoundary>
    )
  }

  return null
}
