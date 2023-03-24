import {BlockHighLighter} from '@app/editor/block-highlighter'
import {CitationsProvider} from '@app/editor/comments/citations-context'
import {ConversationsProvider} from '@app/editor/comments/conversations-context'
import {Editor} from '@app/editor/editor'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {getEditorBlock} from '@app/editor/utils'
import {FileProvider} from '@app/file-provider'
import {
  queryKeys,
  useDocChanges,
  useDocCitations,
  usePublication,
} from '@app/hooks'
import {MouseProvider} from '@app/mouse-context'
import {mouseMachine} from '@app/mouse-machine'
import {PublicationActor} from '@app/publication-machine'
import {classnames} from '@app/utils/classnames'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {ChangesList} from '@components/changes-list'
import {Citations} from '@components/citations'
import {Conversations} from '@components/conversations'
import Footer, {FooterButton} from '@components/footer'
import {Icon} from '@components/icon'
import {Placeholder} from '@components/placeholder-box'
import {useLocation, useRoute} from '@components/router'
import {ScrollArea} from '@components/scroll-area'
import {Text} from '@components/text'
import {MttLink} from '@mintter/shared'
import {keyframes} from '@stitches/react'
import {useQueryClient} from '@tanstack/react-query'
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

const slideDown = keyframes({
  '0%': {transform: 'translateY(-100%)', opacity: 0},
  '100%': {transform: 'translateY(0)', opacity: 1},
})

function OutOfDateBanner({docId, version}: {docId: string; version: string}) {
  const {data: pub, isLoading} = usePublication(docId)
  const [l, setLocation] = useLocation()
  const client = useQueryClient()
  if (isLoading) return null
  if (version === pub?.version) return null
  if (!pub?.version) return null
  return (
    <Box
      css={{
        opacity: 0,
        animation: `${slideDown} 200ms`,
        animationDelay: '300ms',
        animationFillMode: 'forwards',
        paddingInline: '$4',
        paddingBlock: '$2',
        background: '$warning-background-subtle',
        cursor: 'pointer',
        borderBottom: '1px solid blue',
        borderColor: '$warning-border-normal',
        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        '&:hover': {
          background: '$warning-background-normal',
        },
        position: 'absolute',
        width: '$full',
        top: 0,
        left: 0,
      }}
      onMouseEnter={() => {
        client.prefetchQuery({
          queryKey: [queryKeys.GET_PUBLICATION, docId, pub.version],
        })
      }}
    >
      <Text
        css={{
          color: '$warning-text-low',
          textAlign: 'center',
          fontSize: '$2',
        }}
      >
        <a
          onClick={(e) => {
            e.preventDefault()
            setLocation(`/p/${docId}/${pub.version}`)
          }}
        >
          There is a newer version of this Publication. Click here to go to
          latest version →
        </a>
      </Text>
    </Box>
  )
}

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

  const {data: changes} = useDocChanges(params?.id)
  const {data: citations} = useDocCitations(params?.id)

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
      panelSend({type: 'PANEL.OPEN', activePanel: 'conversations'})
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

  if (state.matches('ready') && params?.id) {
    return (
      <ConversationsProvider
        documentId={params.id}
        isOpen={
          activePanel === 'conversations' && resizablePanelState.context.show
        }
        onConversationsOpen={() => {
          panelSend({
            type: 'PANEL.OPEN',
            activePanel: 'conversations',
          })
        }}
        publication={state.context.publication}
      >
        <CitationsProvider
          documentId={params.id}
          onCitationsOpen={(citations: Array<MttLink>) => {
            panelSend({
              type: 'PANEL.OPEN',
              activePanel: 'citations',
            })
          }}
        >
          <MouseProvider value={mouseService}>
            <BlockHighLighter>
              <div className="page-wrapper publication-wrapper">
                <Allotment
                  defaultSizes={[100]}
                  onChange={(values) =>
                    panelSend({type: 'PANEL.RESIZE', values})
                  }
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
                            <OutOfDateBanner
                              docId={state.context.documentId}
                              version={state.context.version}
                            />
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
                            <ChangesList
                              docId={state.context.publication.document.id}
                              version={state.context.version}
                            />
                          ) : (
                            <Citations
                              docId={state.context.publication.document.id}
                              version={state.context.version}
                            />
                          )}
                        </ScrollArea>
                        {/* </section> */}
                      </Allotment.Pane>
                    )}
                </Allotment>
                <Footer>
                  <FooterButton
                    active={activePanel == 'changes'}
                    label={`${changes?.changes?.length} Versions`}
                    icon={<Icon name="Pencil" />}
                    onClick={() => {
                      panelSend({type: 'PANEL.TOGGLE', activePanel: 'changes'})
                    }}
                  />
                  <FooterButton
                    active={activePanel == 'citations'}
                    label={`${citations?.links?.length} Citations`}
                    icon={<Icon name="Link" />}
                    onClick={() => {
                      panelSend({
                        type: 'PANEL.TOGGLE',
                        activePanel: 'citations',
                      })
                    }}
                  />
                  <FooterButton
                    active={
                      activePanel == 'conversations' &&
                      resizablePanelState.context.show
                    }
                    label={`Conversations`}
                    icon={<Icon name="MessageBubble" />}
                    onClick={() => {
                      panelSend({
                        type: 'PANEL.TOGGLE',
                        activePanel: 'conversations',
                      })
                    }}
                  />
                </Footer>
              </div>
            </BlockHighLighter>
          </MouseProvider>
        </CitationsProvider>
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
  /** @xstate-layout N4IgpgJg5mDOIC5QCc4EsBeBDARgGzAFoAHLAOzDwGIAFAQQDkBRAGQDoAVAeQHEeWmAbQAMAXUShiAe1hoALmilkJIAB6IALBoBMbDQHYAjBoCshgGwBmAJwHr2gDQgAnokLbrbABzbhw8-omQZaWGiGWAL4RTqiy2PhEpBTU9MzsAEpMAMoAkgBaQmIq0rIKSirqCMaWbL4m5obGZsJh2hpOrgiEGoa6ll7m1vptXgPmZlEx6PEEJOSUtIysbFw0TAwi4kggJfKKytuVhiYabMJepiahLWEGHYi23uYaXsKWhtYnZvr6UdEgZCkEDgKlimFwsySlGKMj25UObkM-jOJje2m0XlCNn0XhM9y6hks5jYxms5yu42qwz+ESAA */
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
        'PANEL.TOGGLE': [
          {
            cond: 'shouldClosePanel',
            actions: [
              (context) => {
                console.log('IS PANEL VISIBLE!!', context)
              },
              'hidePanel',
              'resetActivePanel',
            ],
          },
          {
            actions: [
              (context) => {
                console.log('IS PANEL NOOOOT VISIBLE!!', context)
              },
              'showPanel',
              'assignActivePanel',
            ],
          },
        ],
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
        updateHandlePosition: assign((_, event) => {
          // hardcoded value to apply to the controls
          let newValue = event.values[0]

          return {left: newValue}
        }),
        // @ts-ignore
        hidePanel: assign({
          show: false,
          activePanel: undefined,
        }),
        showPanel: assign((_, event) => ({
          show: true,
          activePanel: event.activePanel,
        })),
        assignActivePanel: assign({
          activePanel: (_, event) => event.activePanel,
        }),
      },
      guards: {
        shouldClosePanel: (context, event) => {
          if (event.activePanel == context.activePanel) {
            return context.show
          }
          return false
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
