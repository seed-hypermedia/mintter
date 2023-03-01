import {BlockHighLighter} from '@app/editor/block-highlighter'
import {Blocktools} from '@app/editor/blocktools'
import {ConversationsProvider} from '@app/editor/comments/conversations-context'
import {Editor} from '@app/editor/editor'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {getEditorBlock} from '@app/editor/utils'
import {FileProvider} from '@app/file-provider'
import {queryKeys} from '@app/hooks'
import {MouseProvider} from '@app/mouse-context'
import {mouseMachine} from '@app/mouse-machine'
import {PublicationActor} from '@app/publication-machine'
import {classnames} from '@app/utils/classnames'
import {createPromiseClient} from '@bufbuild/connect-web'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {ChangesList} from '@components/changes-list'
import {Citations} from '@components/citations'
import {Conversations} from '@components/conversations'
import Footer from '@components/footer'
import {Icon} from '@components/icon'
import {Placeholder} from '@components/placeholder-box'
import {useRoute} from '@components/router'
import {ScrollArea} from '@components/scroll-area'
import {Tooltip} from '@components/tooltip'
import {Changes, ContentGraph, listCitations, transport} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {listen} from '@tauri-apps/api/event'
import {useActor, useInterpret, useMachine} from '@xstate/react'
import {Allotment} from 'allotment'
import 'allotment/dist/style.css'
import {useEffect, useMemo, useRef, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Editor as SlateEditor} from 'slate'
import {ReactEditor} from 'slate-react'
import {assign, createMachine} from 'xstate'
import '../styles/publication.scss'

const citationsClient = createPromiseClient(ContentGraph, transport)
const changesClient = createPromiseClient(Changes, transport)

export default function PublicationPage({
  publicationActor,
}: {
  publicationActor: PublicationActor
}) {
  let [, params] = useRoute('/p/:id/:version/:block?')

  let editor = useMemo(
    () => buildEditorHook(plugins, EditorMode.Publication),
    [],
  )

  let mouseService = useInterpret(() => mouseMachine)
  let scrollWrapperRef = useRef<HTMLDivElement>(null)

  // this checks if there's a block in the url, so we can highlight and scroll into the selected block
  let [focusBlock, setFocusBlock] = useState(() => params?.block)
  useScrollToBlock(editor, scrollWrapperRef, focusBlock)

  const {data: changes} = useQuery({
    queryFn: () =>
      createPromiseClient(Changes, transport).listChanges({
        objectId: params?.id,
      }),
    queryKey: ['PUBLICATION_CHANGES', params?.id],
    enabled: !!params?.id,
  })

  const {data: citations} = useQuery({
    queryFn: () => citationsClient.listCitations({documentId: params?.id}),
    queryKey: ['PUBLICATION_CITATIONS', params?.id],
    enabled: !!params?.id,
  })

  useEffect(() => {
    let isSubscribed = true
    let unlisten: () => void

    listen('update_focus_window_route', (event) => {
      if (event.payload && typeof event.payload == 'string') {
        let [tBlock] = event.payload.split('/').reverse()
        setFocusBlock(tBlock)
        // setLocation(`/p/${tDoc}/${tVersion}/${tBlock}`, {replace: true})
      }
    }).then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })

  useEffect(() => {
    let unlisten: () => void | undefined

    listen<{conversations: Array<string>}>('selector_click', (event) => {
      panelSend('PANEL.OPEN')
    }).then((f) => (unlisten = f))

    return () => unlisten?.()
  }, [])

  let [resizablePanelState, panelSend] = useMachine(() => resizablePanelMachine)
  let [state, send] = useActor(publicationActor)

  //  useMachine(
  //   () =>
  //     createPublicationMachine({
  //       client,
  //       editor,
  //       documentId: params?.id,
  //       version: params?.version,
  //     }),
  //   {
  //     actions: {
  //       sendActorToParent: () => {
  //         mainService.send({type: 'COMMIT.CURRENT.PUBLICATION', service})
  //       },
  //       onEditSuccess: (_, event) => {
  //         setLocation(`/d/${event.data.id}`)
  //       },
  //     },
  //   },
  // )

  let {activePanel} = resizablePanelState.context

  if (state.matches('errored')) {
    return (
      <div data-testid="publication-section" className="page-wrapper">
        <p>Publication ERROR</p>
        <p>{state.context.errorMessage}</p>
        <Button onClick={() => send('PUBLICATION.FETCH.DATA')} color="muted">
          try again
        </Button>
      </div>
    )
  }

  if (state.matches('ready')) {
    return (
      <ConversationsProvider
        documentId={params?.id}
        onConversationsOpen={(conversations: string[]) => {
          panelSend({
            type: 'PANEL.OPEN',
          })
        }}
        publication={state.context.publication}
      >
        <MouseProvider value={mouseService}>
          <BlockHighLighter>
            <div className="page-wrapper publication-wrapper">
              <Allotment
                defaultSizes={[100]}
                onChange={(values) => panelSend({type: 'PANEL.RESIZE', values})}
              >
                <Allotment.Pane>
                  <section
                    className="publication-section"
                    data-testid="publication-section"
                    onMouseMove={(event) =>
                      mouseService.send({
                        type: 'MOUSE.MOVE',
                        position: event.clientY,
                      })
                    }
                    onMouseLeave={() => {
                      mouseService.send('DISABLE.CHANGE')
                    }}
                  >
                    <ErrorBoundary
                      fallback={<div>error</div>}
                      onReset={() => window.location.reload()}
                    >
                      <FileProvider value={state.context.publication}>
                        <ScrollArea
                          ref={scrollWrapperRef}
                          onScroll={() => mouseService.send('DISABLE.SCROLL')}
                        >
                          <div
                            className={`discussion-toggle ${
                              resizablePanelState.context.show
                                ? 'visible'
                                : undefined
                            }`}
                            style={
                              resizablePanelState.context.show
                                ? {
                                    top: 100,
                                    left: `${resizablePanelState.context.left}px`,
                                    right: 'auto',
                                    transform: 'translateX(-50%)',
                                  }
                                : undefined
                            }
                          >
                            <Tooltip content="Toggle Activity">
                              <button
                                className="discussion-button"
                                onClick={() => {
                                  panelSend('PANEL.TOGGLE')
                                  mouseService.send('DISABLE.WINDOW.RESIZE')
                                }}
                              >
                                <Icon name="MessageBubble" />
                              </button>
                            </Tooltip>
                          </div>
                          {state.context.publication?.document?.content && (
                            <Editor
                              editor={editor}
                              mode={EditorMode.Publication}
                              value={
                                state.context.publication?.document.content
                              }
                              onChange={() => {
                                mouseService.send('DISABLE.CHANGE')
                                // noop
                              }}
                            />
                          )}
                        </ScrollArea>
                      </FileProvider>
                    </ErrorBoundary>
                  </section>
                </Allotment.Pane>
                {resizablePanelState.context.show &&
                  !!state.context.publication && (
                    <Allotment.Pane preferredSize="35%">
                      {/* <section className="discussion-section"> */}
                      <ScrollArea
                        onScroll={() => mouseService.send('DISABLE.SCROLL')}
                      >
                        {activePanel == 'conversations' ? (
                          <Conversations />
                        ) : activePanel == 'changes' ? (
                          <ChangesList />
                        ) : (
                          <Citations />
                        )}
                      </ScrollArea>
                      {/* </section> */}
                    </Allotment.Pane>
                  )}
              </Allotment>
              <Footer>
                <button
                  onClick={() => {
                    panelSend({type: 'PANEL.OPEN', activePanel: 'changes'})
                  }}
                >
                  versions: {changes?.changes?.length}
                </button>
                <button
                  onClick={() => {
                    panelSend({type: 'PANEL.OPEN', activePanel: 'citations'})
                  }}
                >
                  citations: {citations?.links?.length}
                </button>
                <button
                  onClick={() => {
                    panelSend({
                      type: 'PANEL.OPEN',
                      activePanel: 'conversations',
                    })
                  }}
                >
                  conversations
                </button>
              </Footer>
            </div>
          </BlockHighLighter>
        </MouseProvider>
      </ConversationsProvider>
    )
  }

  return (
    <>
      <PublicationShell />

      <p
        className={classnames('publication-fetching-message', {
          visible: state.matches('fetching.extended'),
        })}
      >
        Searching the network...
      </p>
    </>
  )
}

function PublicationShell() {
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

type ActivePanel = 'conversations' | 'citations' | 'changes' | undefined

type ResizablePanelMachineContext = {
  show: boolean
  activePanel: ActivePanel
  left: number
}

type ResizablePanelMachineEvent =
  | {type: 'PANEL.TOGGLE'; activePanel?: ActivePanel}
  | {type: 'PANEL.OPEN'; activePanel?: ActivePanel}
  | {type: 'PANEL.CLOSE'}
  | {type: 'PANEL.RESIZE'; values: Array<number>}

type ResizablePanelMachineServices = {
  matchMediaService: {
    data: void
  }
}
let resizablePanelMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QCc4EsBeBDARgGzAFoAHLAOzDwGIBhAeQDkA1AUQCUBlAQQBUBJRhwB0POgHExAGRYBtAAwBdRKGIB7WGgAuaVWWUgAHogBMANgCsQgJwBGACx2A7I7sAOOXNNe7AGhABPREIbOSshB1s5G1MrNwBmOWNXAF9kv1QNbHwiUgpqNhYOPgAtWUV9NQ1tXX0jBFM5cJtXOLi7KwarOMdzP0CEYNdTISiWh0cu1xtjLtT09CyCEnJKWkZWTl4BBmE6AAUWBnklJBBKrR09U7qbRzihHuNHV1dzWKerV2M+xBDHB+M01MrTcgJScxAZFUEDg+gymFwS1ylAq6guNWuQTsjSiFhCHisjgspmMvQCWJsIwcNnMri65nMdlMrh6qVSQA */
  createMachine(
    {
      predictableActionArguments: true,
      context: {
        show: false,
        left: 100,
        activePanel: 'conversations',
      },
      tsTypes: {} as import('./publication.typegen').Typegen0,
      schema: {
        context: {} as ResizablePanelMachineContext,
        events: {} as ResizablePanelMachineEvent,
        services: {} as ResizablePanelMachineServices,
      },
      on: {
        'PANEL.TOGGLE': {
          actions: ['toggleShow'],
        },
        'PANEL.RESIZE': {
          actions: 'updateHandlePosition',
        },
        'PANEL.OPEN': {
          actions: ['showPanel', 'assignActivePanel'],
        },
      },
      id: 'resizable-panel',
    },
    {
      actions: {
        updateHandlePosition: assign((context, event) => {
          // hardcoded value to apply to the controls
          let newValue = event.values[0]

          return {left: newValue}
        }),
        toggleShow: assign({
          show: (context) => !context.show,
        }),
        showPanel: assign((_, event) => ({
          show: true,
          activePanel: event.activePanel,
        })),
        assignActivePanel: assign({
          activePanel: (_, event) => event.activePanel,
        }),
      },
    },
  )

// eslint-disable-next-line
function useScrollToBlock(editor: SlateEditor, ref: any, blockId?: string) {
  // TODO: find a way to scroll to the block when clicking on a mintter link
  useEffect(() => {
    setTimeout(() => {
      if (blockId) {
        if (ref?.current) {
          let entry = getEditorBlock(editor, {id: blockId})

          if (entry) {
            let [block] = entry
            let elm = ReactEditor.toDOMNode(editor, block)

            let rect = elm.getBoundingClientRect()
            let wrapper = ref.current.getBoundingClientRect()
            ref.current.scrollTo({top: rect.top - wrapper.top - 24})
          }
        }
      }
    }, 1000)
  }, [ref, blockId, editor])
}
