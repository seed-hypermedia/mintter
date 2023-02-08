import {BlockHighLighter} from '@app/editor/block-highlighter'
import {Blocktools} from '@app/editor/blocktools'
import {ConversationsProvider} from '@app/editor/comments/conversations-context'
import {Editor} from '@app/editor/editor'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {getEditorBlock} from '@app/editor/utils'
import {FileProvider} from '@app/file-provider'
import {MouseProvider} from '@app/mouse-context'
import {mouseMachine} from '@app/mouse-machine'
import {PublicationActor} from '@app/publication-machine'
import {classnames} from '@app/utils/classnames'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Conversations} from '@components/conversations'
import {Icon} from '@components/icon'
import {Placeholder} from '@components/placeholder-box'
import {useRoute} from '@components/router'
import {ScrollArea} from '@components/scroll-area'
import {Tooltip} from '@components/tooltip'
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
            type: 'DISCUSSION.HIGHLIGHT.CONVERSATIONS',
            conversations,
          })
        }}
      >
        <MouseProvider value={mouseService}>
          <BlockHighLighter>
            <div className="page-wrapper publication-wrapper">
              <Allotment
                defaultSizes={[100]}
                onChange={(values) => panelSend({type: 'RESIZE', values})}
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
                              resizablePanelState.context.visible
                                ? 'visible'
                                : undefined
                            }`}
                            style={
                              resizablePanelState.context.visible
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
                                  panelSend('DISCUSSION.TOGGLE')
                                  mouseService.send('DISABLE.WINDOW.RESIZE')
                                }}
                              >
                                <Icon name="MessageBubble" />
                              </button>
                            </Tooltip>
                          </div>
                          {state.context.publication?.document?.content && (
                            <Blocktools editor={editor}>
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
                            </Blocktools>
                          )}
                        </ScrollArea>
                      </FileProvider>
                    </ErrorBoundary>
                  </section>
                </Allotment.Pane>
                {resizablePanelState.context.visible &&
                  !!state.context.publication && (
                    <Allotment.Pane preferredSize="35%">
                      <section className="discussion-section">
                        <ScrollArea
                          onScroll={() => mouseService.send('DISABLE.SCROLL')}
                        >
                          <Conversations
                            publication={state.context.publication}
                            visible={resizablePanelState.context.visible}
                          />
                        </ScrollArea>
                      </section>
                    </Allotment.Pane>
                  )}
              </Allotment>
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

type ResizablePanelMachineContext = {
  visible: boolean
  left: number
  highlightConversations: Array<string>
}

type ResizablePanelMachineEvent =
  | {type: 'DISCUSSION.TOGGLE'}
  | {type: 'DISCUSSION.HIGHLIGHT.CONVERSATIONS'; conversations: Array<string>}
  | {type: 'RESIZE'; values: Array<number>}

type ResizablePanelMachineServices = {
  matchMediaService: {
    data: void
  }
}
let resizablePanelMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QCc4EsBeBDARgGzAFoAHLAOzDwGIAlAUQGUBJALToG0AGAXUVGID2sNABc0AsnxAAPRADZOAOgAsARgAcAZk3KAnAt2aA7AFYANCACeiQhrmLOGncqOH1qgEyGAvt4uphbHwiUgpqAFkAQQAVAGEACXC6ABEmSMUouPiuXiQQQWExCSlZBE97Tj0PdRN1OrkjDXULazKTZUUFdU5HI051XXVlTXVfPxAyAQg4KQDMXAISckopAtFxSTzSwmUlRzkTVR7OXSMDuQ9zKxs1B2U1WsMTdrl1UzHvIA */
  createMachine(
    {
      predictableActionArguments: true,
      context: {visible: false, left: 100, highlightConversations: []},
      tsTypes: {} as import('./publication.typegen').Typegen0,
      schema: {
        context: {} as ResizablePanelMachineContext,
        events: {} as ResizablePanelMachineEvent,
        services: {} as ResizablePanelMachineServices,
      },
      on: {
        'DISCUSSION.TOGGLE': {
          actions: 'toggleVisibility',
        },
        'DISCUSSION.HIGHLIGHT.CONVERSATIONS': {
          actions: 'setHighlightConversations',
        },
        RESIZE: {
          actions: 'updateHandlePosition',
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
        toggleVisibility: assign({
          visible: (context) => !context.visible,
        }),
        setHighlightConversations: (context, event) => {
          context.highlightConversations = event.conversations
          context.visible = true
        },
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
