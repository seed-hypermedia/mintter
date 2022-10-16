// import 'show-keys'
import {Document} from '@app/client'
import {createDraftMachine} from '@app/draft-machine'
import {BlockHighLighter} from '@app/editor/block-highlighter'
import {Blocktools} from '@app/editor/blocktools'
import {Editor} from '@app/editor/editor'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {FileProvider} from '@app/file-provider'
import {useMain} from '@app/main-context'
import {MouseProvider} from '@app/mouse-context'
import {mouseMachine} from '@app/mouse-machine'
import {ChildrenOf} from '@app/mttast'
import {AppError} from '@app/root'
import {RouteComponentProps, useLocation, useRoute} from '@components/router'
import {ScrollArea} from '@components/scroll-area'
import {Text} from '@components/text'
import {useQueryClient} from '@tanstack/react-query'
import {useInterpret, useMachine} from '@xstate/react'
import {useEffect, useMemo} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import toast from 'react-hot-toast'
import {Editor as SlateEditor, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'

type DraftPageProps = RouteComponentProps<{
  shouldAutosave?: boolean
}>

export default function DraftWrapper({shouldAutosave = true}: DraftPageProps) {
  let client = useQueryClient()
  let mainService = useMain()
  let [, params] = useRoute('/d/:id')
  let [, setLocation] = useLocation()
  let mouseService = useInterpret(() => mouseMachine)
  let editor = useMemo(() => buildEditorHook(plugins, EditorMode.Draft), [])

  useInitialFocus(editor)

  let [state, send, service] = useMachine(
    () =>
      createDraftMachine({
        client,
        documentId: params?.id,
        shouldAutosave,
        editor,
      }),
    {
      actions: {
        sendActorToParent: () => {
          mainService.send({type: 'COMMIT.CURRENT.DRAFT', service})
        },
        afterPublish: (_, event) => {
          setLocation(`/p/${event.data.document?.id}/${event.data.version}`)
          toast.success('Draft published Successfully!')
        },
      },
    },
  )

  if (state.matches('errored')) {
    return <Text>ERROR: {state.context.errorMessage}</Text>
  }

  if (state.matches('fetching')) {
    return <DraftShell />
  }

  if (state.matches('editing')) {
    return (
      <div
        data-testid="draft-wrapper"
        className="page-wrapper"
        onMouseMove={(event) => {
          mouseService.send({type: 'MOUSE.MOVE', position: event.clientY})

          // if (!canEdit) {
          //   mainService.send('NOT.EDITING')
          // }
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
            {state.context.localDraft?.content && (
              <MouseProvider value={mouseService}>
                <BlockHighLighter>
                  <FileProvider value={service}>
                    <Blocktools editor={editor}>
                      <Editor
                        editor={editor}
                        value={state.context.localDraft.content}
                        //@ts-ignore
                        onChange={(content: ChildrenOf<Document>) => {
                          if (!content && typeof content == 'string') return
                          mouseService.send('DISABLE.CHANGE')
                          mainService.send('EDITING')
                          send({type: 'DRAFT.UPDATE', payload: {content}})
                        }}
                      />
                    </Blocktools>
                  </FileProvider>
                </BlockHighLighter>
              </MouseProvider>
            )}
          </ScrollArea>
        </ErrorBoundary>
      </div>
    )
  }

  return null
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
  return null
}
