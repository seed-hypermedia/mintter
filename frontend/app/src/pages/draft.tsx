// import 'show-keys'
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
import {
  ChildrenOf,
  Document,
  publishDraft as apiPublishDraft,
} from '@mintter/shared'
import {AppError} from '@app/root'
import {openWindow} from '@app/utils/open-window'
import {Box} from '@components/box'
import {Placeholder} from '@components/placeholder-box'
import {useLocation, useRoute} from '@components/router'
import {ScrollArea} from '@components/scroll-area'
import {Text} from '@components/text'
import {useQueryClient} from '@tanstack/react-query'
import {invoke} from '@tauri-apps/api'
import {appWindow} from '@tauri-apps/api/window'
import {useInterpret, useMachine} from '@xstate/react'
import {useEffect, useMemo} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import toast from 'react-hot-toast'
import {Editor as SlateEditor, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'

type DraftPageProps = {
  shouldAutosave?: boolean
  publishDraft?: typeof apiPublishDraft
  editor?: SlateEditor
}

export default function DraftWrapper({
  shouldAutosave = true,
  publishDraft = apiPublishDraft,
  editor,
}: DraftPageProps) {
  let client = useQueryClient()
  let mainService = useMain()
  let [, params] = useRoute('/d/:id/:tag?')
  let [, setLocation] = useLocation()
  let mouseService = useInterpret(() => mouseMachine)

  // @ts-ignore
  window.mouseService = mouseService
  let localEditor = useMemo(
    () => buildEditorHook(plugins, EditorMode.Draft),
    [],
  )
  let _editor = editor ?? localEditor
  useInitialFocus(_editor)

  let [state, send, service] = useMachine(() =>
    createDraftMachine({
      client,
      documentId: params?.id,
      shouldAutosave,
      editor: _editor,
    }).withConfig({
      actions: {
        sendActorToParent: () => {
          mainService.send({type: 'COMMIT.CURRENT.DRAFT', service})
        },
        afterPublish: (_, event) => {
          invoke('emit_all', {
            event: 'document_published',
          })
          let searchParams = new URLSearchParams(window.location.search)
          let replyToParams = searchParams.get('replyto')
          if (replyToParams) {
            let [docId, version] = replyToParams.split('/')
            openWindow(`/p/${docId}/${version}`)
            appWindow.close()
          } else {
            setLocation(`/p/${event.data.document?.id}/${event.data.version}`, {
              replace: true,
            })
          }
          toast.success('Draft published Successfully!')
        },
      },
      services: {
        // @ts-ignore
        publishDraft: (context) => {
          return publishDraft(context.documentId)
        },
      },
    }),
  )

  if (state.matches('errored')) {
    return <Text>ERROR: {state.context.errorMessage}</Text>
  }

  if (state.matches('editing')) {
    return (
      <div
        data-testid="draft-wrapper"
        className="page-wrapper"
        onMouseMove={(event) => {
          mouseService.send({type: 'MOUSE.MOVE', position: event.clientY})

          service.send('EDITING.STOP')
        }}
        onMouseLeave={() => {
          mouseService.send('DISABLE.CHANGE')
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
              <BlockHighLighter>
                <FileProvider value={state.context.draft}>
                  <Blocktools editor={_editor}>
                    {state.context.localDraft?.content ? (
                      <Editor
                        editor={_editor}
                        value={state.context.localDraft.content}
                        //@ts-ignore
                        onChange={(content: ChildrenOf<Document>) => {
                          if (!content && typeof content == 'string') return
                          mouseService.send('DISABLE.CHANGE')
                          service.send('EDITING.START')
                          send({type: 'DRAFT.UPDATE', payload: {content}})
                        }}
                      />
                    ) : null}
                  </Blocktools>
                </FileProvider>
              </BlockHighLighter>
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
