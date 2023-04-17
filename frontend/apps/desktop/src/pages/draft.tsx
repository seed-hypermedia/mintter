// import 'show-keys'
import {AppBanner, BannerText} from '@app/app-banner'
import {DragProvider} from '@app/drag-context'
import {createDragMachine} from '@app/drag-machine'
import {BlockHighLighter} from '@app/editor/block-highlighter'
import {Editor} from '@app/editor/editor'
import {MainActor} from '@app/models/main-actor'
import {MouseProvider} from '@app/mouse-context'
import {mouseMachine} from '@app/mouse-machine'
import {useDaemonReady} from '@app/node-status-context'
import {AppError} from '@app/root'
import {Box} from '@components/box'
import Footer from '@components/footer'
import {Placeholder} from '@components/placeholder-box'
import {ChildrenOf, Document} from '@mintter/shared'
import {Button, MainWrapper, SizableText, XStack, YStack} from '@mintter/ui'
import {useActor, useInterpret} from '@xstate/react'
import {useEffect, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Editor as SlateEditor, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'

export default function DraftPage({mainActor}: {mainActor: MainActor}) {
  if (mainActor.type !== 'draft')
    throw new Error('Draft actor must be passed to DraftPage')
  const draftActor = mainActor.actor
  const editor = mainActor.editor
  const [state, send] = useActor(draftActor)
  const [debugValue, setDebugValue] = useState(false)
  let mouseService = useInterpret(() => mouseMachine)
  let dragService = useInterpret(() => createDragMachine(editor))
  let isDaemonReady = useDaemonReady()

  // @ts-ignore
  window.mouseService = mouseService

  useInitialFocus(editor)

  useEffect(() => {
    if (isDaemonReady) {
      send('IS_DAEMON_READY')
    }
  }, [isDaemonReady])

  // console.log('🚀 ~ file: draft.tsx:36 ~ DraftPage ~ state', state)

  // if (state.matches('errored')) {
  //   return <Text>ERROR: {state.context.errorMessage}</Text>
  // }

  if (state.matches('editing')) {
    return (
      <ErrorBoundary
        FallbackComponent={AppError}
        onReset={() => window.location.reload()}
      >
        <MouseProvider value={mouseService}>
          <DragProvider value={dragService}>
            <BlockHighLighter>
              <MainWrapper>
                <YStack
                  onScroll={() => {
                    mouseService.send('DISABLE.SCROLL')

                    // if (!canEdit) {
                    //   mainService.send('NOT.EDITING')
                    // }
                  }}
                  // @ts-ignore
                  onMouseMove={(event) => {
                    mouseService.send({
                      type: 'MOUSE.MOVE',
                      position: event.clientY,
                    })
                    mainActor.actor.send('EDITING.STOP')
                  }}
                  onMouseLeave={() => {
                    mouseService.send('DISABLE.CHANGE')
                  }}
                  onMouseUp={() => {
                    dragService.send('DROPPED')
                    mouseService.send('DISABLE.DRAG.END')
                  }}
                >
                  {!isDaemonReady ? <NotSavingBanner /> : null}
                  {state.context.localDraft?.content ? (
                    <>
                      <Editor
                        editor={editor}
                        readOnly={!isDaemonReady}
                        value={state.context.localDraft.content}
                        //@ts-ignore
                        onChange={(content: ChildrenOf<Document>) => {
                          if (
                            (!content && typeof content == 'string') ||
                            !isDaemonReady
                          )
                            return
                          mouseService.send('DISABLE.CHANGE')
                          mainActor.actor.send('EDITING.START')
                          // @ts-ignore
                          send({type: 'DRAFT.UPDATE', payload: {content}})
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
                                {JSON.stringify(
                                  state.context.localDraft?.content,
                                  null,
                                  3,
                                )}
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
            </BlockHighLighter>
          </DragProvider>
        </MouseProvider>
      </ErrorBoundary>
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

function NotSavingBanner() {
  return (
    <AppBanner>
      <BannerText>The Draft is not being saved right now.</BannerText>
    </AppBanner>
  )
}
