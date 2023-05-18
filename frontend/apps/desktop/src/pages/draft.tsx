// import 'show-keys'
import {AppBanner, BannerText} from '@app/app-banner'
import {Editor, plugins, useTauriListeners} from '@app/editor/editor'

import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {useEditorDraft, useSaveDraft} from '@app/models/documents'
import {MouseProvider} from '@app/mouse-context'
import {mouseMachine} from '@app/mouse-machine'
import {useDaemonReady} from '@app/node-status-context'
import {AppError} from '@app/root'
import {useNavRoute} from '@app/utils/navigation'
import Footer from '@components/footer'
import {Placeholder} from '@components/placeholder-box'
import {
  group,
  GroupingContent,
  paragraph,
  statement,
  text,
} from '@mintter/shared'
import {Button, MainWrapper, SizableText, XStack, YStack} from '@mintter/ui'
import {useInterpret} from '@xstate/react'
import {useEffect, useMemo, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Editor as SlateEditor, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'

let emptyEditorValue = group({data: {parent: ''}}, [
  statement([paragraph([text('')])]),
])

export default function DraftPage() {
  let route = useNavRoute()
  if (route.key != 'draft')
    throw new Error('Draft actor must be passed to DraftPage')

  const [debugValue, setDebugValue] = useState(false)
  const docId = route.draftId // TODO, clean this up when draftId != docId
  const editor = useMemo(() => buildEditorHook(plugins, EditorMode.Draft), [])

  const {
    data: draftState,
    status,
    error,
    refetch,
  } = useEditorDraft({
    editor,
    documentId: docId,
    initWebUrl: route.contextSiteHost,
  })

  let mouseService = useInterpret(() => mouseMachine)
  let isDaemonReady = useDaemonReady()

  useInitialFocus(editor)
  useTauriListeners(editor)

  // TODO: safe when loading the first time a new draft: this is to load the epty block generated when start inside the `editorValue` useMemo
  const saveDraft = useSaveDraft(docId)

  if (status == 'loading') {
    return <DraftShell />
  }

  if (status == 'error') {
    return <AppError error={error} resetErrorBoundary={() => refetch()} />
  }

  return (
    <ErrorBoundary
      FallbackComponent={AppError}
      onReset={() => window.location.reload()}
    >
      <MouseProvider value={mouseService}>
        <MainWrapper
          onScroll={() => {
            mouseService.send('DISABLE.SCROLL')
          }}
        >
          <YStack
            onPointerMove={(event) => {
              mouseService.send({
                type: 'MOUSE.MOVE',
                position: event.nativeEvent.clientY,
              })
            }}
            onPointerLeave={() => {
              mouseService.send('DISABLE.CHANGE')
            }}
          >
            {!isDaemonReady ? <NotSavingBanner /> : null}
            {draftState.children.length ? (
              <>
                <Editor
                  editor={editor}
                  value={draftState.children}
                  //@ts-ignore
                  onChange={(content: GroupingContent[]) => {
                    // this is used to filter operations that are not changing the actual editor content.
                    const isAstChange = editor.operations.some(
                      (op) => 'set_selection' !== op.type,
                    )

                    if (isAstChange) {
                      // TODO: need to check when content can be a string
                      if (
                        (!content && typeof content == 'string') ||
                        !isDaemonReady
                      )
                        return
                      mouseService.send('DISABLE.CHANGE')
                      saveDraft.mutate({content})
                    }
                  }}
                />
                {import.meta.env.DEV && (
                  <YStack maxWidth="500px" marginHorizontal="auto">
                    <Button
                      size="$1"
                      theme="gray"
                      width="100%"
                      onPress={() => setDebugValue((v) => !v)}
                    >
                      toggle value
                    </Button>
                    {debugValue && (
                      <XStack
                        tag="pre"
                        {...{
                          whiteSpace: 'wrap',
                        }}
                      >
                        <SizableText tag="code" size="$1">
                          {JSON.stringify(draftState?.children, null, 3)}
                        </SizableText>
                      </XStack>
                    )}
                  </YStack>
                )}
              </>
            ) : null}
          </YStack>
        </MainWrapper>
        <Footer />
      </MouseProvider>
    </ErrorBoundary>
  )
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
    <YStack
      marginTop="$7"
      width="100%"
      maxWidth="600px"
      gap="$6"
      marginHorizontal="auto"
    >
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
    </YStack>
  )
}

function BlockPlaceholder() {
  return (
    <YStack width="600px" gap="$2">
      <Placeholder width="100%" />
      <Placeholder width="92%" />
      <Placeholder width="84%" />
      <Placeholder width="90%" />
    </YStack>
  )
}

function NotSavingBanner() {
  return (
    <AppBanner>
      <BannerText>The Draft is not being saved right now.</BannerText>
    </AppBanner>
  )
}
