import {BlockHighLighter} from '@app/editor/block-highlighter'
import {Blocktools} from '@app/editor/blocktools'
import {Editor} from '@app/editor/editor'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {getEditorBlock} from '@app/editor/utils'
import {FileProvider} from '@app/file-provider'
import {useMain} from '@app/main-context'
import {MouseProvider} from '@app/mouse-context'
import {mouseMachine} from '@app/mouse-machine'
import {createPublicationMachine} from '@app/publication-machine'
import {classnames} from '@app/utils/classnames'
import {error} from '@app/utils/logger'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Discussion} from '@components/discussion'
import {Icon} from '@components/icon'
import {Placeholder} from '@components/placeholder-box'
import {useLocation, useRoute} from '@components/router'
import {ScrollArea} from '@components/scroll-area'
import {Tooltip} from '@components/tooltip'
import {useQueryClient} from '@tanstack/react-query'
import {listen} from '@tauri-apps/api/event'
import {useInterpret, useMachine} from '@xstate/react'
import {Allotment} from 'allotment'
import 'allotment/dist/style.css'
import {useEffect, useMemo, useRef, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Editor as SlateEditor} from 'slate'
import {ReactEditor} from 'slate-react'
import {assign, createMachine} from 'xstate'
import '../styles/publication.scss'

export default function PublicationWrapper() {
  let client = useQueryClient()
  let mainService = useMain()
  let [, params] = useRoute('/p/:id/:version/:block?')
  let [, setLocation] = useLocation()
  let [focusBlock, setFocusBlock] = useState(() => params?.block)
  let mouseService = useInterpret(() => mouseMachine)
  let editor = useMemo(
    () => buildEditorHook(plugins, EditorMode.Publication),
    [],
  )
  let scrollWrapperRef = useRef<HTMLDivElement>(null)

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

  let [state, send, service] = useMachine(
    () =>
      createPublicationMachine({
        client,
        editor,
        documentId: params?.id,
        version: params?.version,
      }),
    {
      actions: {
        sendActorToParent: () => {
          mainService.send({type: 'COMMIT.CURRENT.PUBLICATION', service})
        },
        onEditSuccess: (_, event) => {
          setLocation(`/d/${event.data.id}`)
        },
      },
    },
  )

  // return <PublicationShell />

  if (state.matches('publication.fetching')) {
    return (
      <>
        <PublicationShell />

        <p
          className={classnames('publication-fetching-message', {
            visible: state.matches('publication.fetching.extended'),
          })}
        >
          Searching the network...
        </p>
      </>
    )
  }

  if (state.matches('publication.errored')) {
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

  let topOffset = resizablePanelState.context.vertical ? 82 : 0
  let top = resizablePanelState.context.top - topOffset

  if (state.matches('publication.ready')) {
    return (
      <MouseProvider value={mouseService}>
        <BlockHighLighter>
          <div className="page-wrapper publication-wrapper">
            <Allotment
              vertical={resizablePanelState.context.vertical}
              key={resizablePanelState.context.vertical}
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
                                  top: `${top}px`,
                                  left: `${resizablePanelState.context.left}px`,
                                  right: 'auto',
                                  transform: resizablePanelState.context
                                    .vertical
                                    ? 'translateY(50%)'
                                    : 'translateX(-50%)',
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
                  <Allotment.Pane preferredSize={'35%'}>
                    <section className="discussion-section">
                      <ScrollArea
                        onScroll={() => mouseService.send('DISABLE.SCROLL')}
                      >
                        <Discussion
                          visible={resizablePanelState.context.visible}
                          publication={state.context.publication}
                          onReply={() => send('PUBLICATION.REPLY')}
                        />
                      </ScrollArea>
                    </section>
                  </Allotment.Pane>
                )}
            </Allotment>
          </div>
        </BlockHighLighter>
      </MouseProvider>
    )
  }
  return null
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
  top: number
  left: number
  vertical: boolean
  visible: boolean
}

type ResizablePanelMachineEvent =
  | {type: 'DISCUSSION.TOGGLE'}
  | {type: 'RESIZE'; values: Array<number>}
  | {type: 'MATCHMEDIA.MATCH'; match: boolean}

type ResizablePanelMachineServices = {
  matchMediaService: {
    data: void
  }
}
let resizablePanelMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QCc4EsBeBDARgGzAFoAHLAOzDwGIAlAUQGUBJALToG0AGAXUVGID2sNABc0AsnxAAPRADZOAOgAsARgAcAZk3KAnAt2aA7AFYANCACeiQhrmLOGncqOH1qgEyGAvt4uphbHwiUgpqAFkAQQAVAGEACXC6ABEmSMUouPiuXiQQQWExCSlZBE97Tj0PdRN1OrkjDXULazKTZUUFdU5HI051XXVlTXVfPxAyAQg4KQDMXAISckopAtFxSTzSwmUlRzkTVR7OXSMDuQ9zKxs1B2U1WsMTdrl1UzHvIA */
  createMachine(
    {
      context: {top: 100, left: 100, vertical: false, visible: false},
      tsTypes: {} as import('./publication.typegen').Typegen0,
      schema: {
        context: {} as ResizablePanelMachineContext,
        events: {} as ResizablePanelMachineEvent,
        services: {} as ResizablePanelMachineServices,
      },
      invoke: {
        src: 'matchMediaService',
        id: 'matchMediaService',
      },
      on: {
        'DISCUSSION.TOGGLE': {
          actions: 'setDiscussionVisibility',
        },
        RESIZE: {
          actions: 'updateHandlePosition',
        },
        'MATCHMEDIA.MATCH': {
          actions: ['setOrientation'],
        },
      },
      id: 'resizable-panel',
    },
    {
      actions: {
        setOrientation: assign({
          vertical: (_, event) => event.match,
        }),
        updateHandlePosition: assign((context, event) => {
          // hardcoded value to apply to the controls
          let newValue = event.values[0]

          if (context.vertical) {
            return {top: newValue, left: 0}
          } else {
            return {left: newValue, top: 100}
          }
        }),
        setDiscussionVisibility: assign({
          visible: (context) => !context.visible,
        }),
      },
      services: {
        matchMediaService: () => (sendBack) => {
          let responsiveMedia = window.matchMedia('(max-width: 768px)')

          if (typeof responsiveMedia.addEventListener == 'function') {
            responsiveMedia.addEventListener('change', handler)
          } else if (typeof responsiveMedia.addListener == 'function') {
            responsiveMedia.addListener(handler)
          } else {
            error('matchMedia support error', responsiveMedia)
          }

          // initial set
          sendBack({type: 'MATCHMEDIA.MATCH', match: responsiveMedia.matches})

          return () => {
            responsiveMedia.removeEventListener('change', handler)
          }

          function handler(event: MediaQueryListEvent) {
            sendBack({type: 'MATCHMEDIA.MATCH', match: event.matches})
          }
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
    }, 100)
  }, [ref, blockId, editor])
}
