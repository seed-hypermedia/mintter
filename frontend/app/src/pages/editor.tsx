// import 'show-keys'
import {Document} from '@app/client'
import {BlockTools} from '@app/editor/block-tools'
import {BlockToolsProvider} from '@app/editor/block-tools-context'
import {blockToolsMachine} from '@app/editor/block-tools-machine'
import {Editor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {FileProvider} from '@app/file-provider'
import {useCurrentFile, useIsEditing, useMain} from '@app/main-context'
import {DraftRef} from '@app/main-machine'
import {ChildrenOf} from '@app/mttast'
import {MainWindow} from '@app/pages/window-components'
import {AppError} from '@app/root'
import {Box} from '@components/box'
import {Text} from '@components/text'
import {useActor, useInterpret} from '@xstate/react'
import {useEffect, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Editor as SlateEditor, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {InterpreterFrom} from 'xstate'

export type EditorPageProps = {
  editor?: SlateEditor
  shouldAutosave?: boolean
  draftRef: DraftRef
  blockToolsService?: InterpreterFrom<typeof blockToolsMachine>
}

export function useDraft(ref: DraftRef) {
  useEffect(() => {
    ref.send('LOAD')
    return () => {
      ref.send('UNLOAD')
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
}

function EditorPage({draftRef, blockToolsService: _btS}: EditorPageProps) {
  const [visible, setVisible] = useState(false)
  const [state, send] = useDraft(draftRef)
  let localBlocktoolsService = useInterpret(() => blockToolsMachine)
  let blocktoolsService = _btS || localBlocktoolsService

  const {context} = state
  const mainService = useMain()
  const isEditing = useIsEditing()

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
        <MainWindow onScroll={() => blocktoolsService.send('DISABLE')}>
          <Box data-testid="editor-wrapper">
            {context.localDraft?.content && (
              <>
                <FileProvider value={draftRef}>
                  <BlockToolsProvider value={blocktoolsService}>
                    <div
                      onMouseMove={(event) => {
                        blocktoolsService.send({
                          type: 'MOUSE.MOVE',
                          mouseY: event.clientY,
                        })
                        if (isEditing) {
                          mainService.send('MOUSE.MOVE')
                        }
                      }}
                      onMouseLeave={() => {
                        blocktoolsService.send('DISABLE')
                      }}
                    >
                      <BlockTools
                        isEditing={isEditing}
                        mode={EditorMode.Draft}
                      />
                      <Editor
                        editor={state.context.editor}
                        value={context.localDraft.content}
                        //@ts-ignore
                        onChange={(content: ChildrenOf<Document>) => {
                          if (!content && typeof content == 'string') return
                          blocktoolsService.send('EDITING')
                          mainService.send('EDITING')
                          send({type: 'DRAFT.UPDATE', payload: {content}})
                        }}
                      />
                    </div>
                  </BlockToolsProvider>
                </FileProvider>
                <Box css={{margin: '$9', marginLeft: '$7'}}>
                  <button type="button" onClick={() => setVisible((v) => !v)}>
                    toggle Value
                  </button>
                  {visible && (
                    <Box as="pre">
                      {JSON.stringify(context.localDraft.content, null, 2)}
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Box>
        </MainWindow>
      </ErrorBoundary>
    )
  }

  return null
}
