// import 'show-keys'
import {AppError} from '@app/app'
import {mainService as defaultMainService} from '@app/app-providers'
import {Document} from '@app/client'
import {createDraftMachine} from '@app/draft-machine'
import {BlockTools} from '@app/editor/block-tools'
import {BlockToolsProvider} from '@app/editor/block-tools-context'
import {blockToolsMachine} from '@app/editor/block-tools-machine'
import {Editor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {FileProvider} from '@app/file-provider'
import {DraftRef} from '@app/main-machine'
import {MainWindow} from '@app/pages/window-components'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {FileTime} from '@components/file-time'
import {
  headerButtonsStyles,
  headerMetadataStyles,
  headerStyles,
} from '@components/page-header'
import {Text} from '@components/text'
import {ChildrenOf} from '@mintter/mttast'
import {useActor, useInterpret} from '@xstate/react'
import {useEffect, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Editor as SlateEditor, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {StateFrom} from 'xstate'

export type EditorPageProps = {
  editor?: SlateEditor
  shouldAutosave?: boolean
  draftRef: DraftRef
  mainService?: typeof defaultMainService
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

export default function EditorPage({draftRef}: EditorPageProps) {
  const [visible, setVisible] = useState(false)
  const [state, send] = useDraft(draftRef)
  const blockToolsService = useInterpret(() => blockToolsMachine)

  const {context} = state

  useInitialFocus(context.editor)

  if (state.matches('errored')) {
    return <Text>ERROR: {context.errorMessage}</Text>
  }

  if (state.matches('editing')) {
    return (
      <MainWindow onScroll={() => blockToolsService.send('DISABLE')}>
        <ErrorBoundary
          FallbackComponent={AppError}
          onReset={() => window.location.reload()}
        >
          <Box className={headerStyles()}>
            <Box className={headerMetadataStyles()}>
              <FileTime type="draft" document={state.context.draft} />
            </Box>
            <Box className={headerButtonsStyles()}>
              <EditorStatus state={state} />
              <Button
                color="success"
                variant="ghost"
                size="1"
                disabled={!state.can('DRAFT.PUBLISH')}
                data-testid="submit-publish"
                onClick={() => {
                  send('DRAFT.PUBLISH')
                }}
              >
                Publish
              </Button>
            </Box>
          </Box>
          <Box data-testid="editor-wrapper" css={{paddingTop: '$5'}}>
            {context.localDraft?.content && (
              <>
                <FileProvider value={draftRef}>
                  <BlockToolsProvider value={blockToolsService}>
                    <BlockTools
                      mode={EditorMode.Draft}
                      service={blockToolsService}
                    />
                    <Editor
                      editor={state.context.editor}
                      value={context.localDraft.content}
                      //@ts-ignore
                      onChange={(content: ChildrenOf<Document>) => {
                        if (!content && typeof content == 'string') return
                        blockToolsService.send('DISABLE')
                        send({type: 'DRAFT.UPDATE', payload: {content}})
                      }}
                    />
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
        </ErrorBoundary>
      </MainWindow>
    )
  }

  return null
}

function EditorStatus({
  state,
}: {
  state: StateFrom<ReturnType<typeof createDraftMachine>>
}) {
  return (
    <Box
      css={{
        display: 'flex',
        gap: '$3',
        alignItems: 'center',
      }}
    >
      <Text color="muted" size="1">
        {state.matches('editing.idle')
          ? 'saved'
          : state.matches('editing.debouncing')
          ? 'unsaved'
          : state.matches('editing.saving')
          ? 'saving...'
          : ''}
      </Text>
      <Box
        css={{
          $$size: '$space$4',
          width: '$$size',
          height: '$$size',
          borderRadius: '$round',
          backgroundColor: state.matches('editing.idle')
            ? '$success-component-bg-active'
            : state.matches('editing.debouncing')
            ? '$base--component-bg-active'
            : state.matches('editing.saving')
            ? '$warning-component-bg-active'
            : '$danger-component-bg-active',
        }}
      />
    </Box>
  )
}
