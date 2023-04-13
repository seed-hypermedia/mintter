import {AppBanner, BannerText} from '@app/app-banner'
import {features} from '@app/constants'
import {BlockHighLighter} from '@app/editor/block-highlighter'
import {CitationsProvider} from '@app/editor/comments/citations-context'
import {ConversationsProvider} from '@app/editor/comments/conversations-context'
import {Editor} from '@app/editor/editor'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {getEditorBlock} from '@app/editor/utils'
import {useDocChanges} from '@app/hooks/changes'
import {usePublication} from '@app/hooks/documents'
import {useDocCitations} from '@app/hooks/content-graph'
import {queryKeys} from '@app/hooks/query-keys'
import {MouseProvider} from '@app/mouse-context'
import {mouseMachine} from '@app/mouse-machine'
import {classnames} from '@app/utils/classnames'
import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {Box} from '@components/box'
import {ChangesList} from '@components/changes-list'
import {Citations} from '@components/citations'
import {Conversations} from '@components/conversations'
import Footer, {FooterButton} from '@components/footer'
import {Icon} from '@components/icon'
import {Placeholder} from '@components/placeholder-box'
import {MttLink} from '@mintter/shared'
import {useQueryClient} from '@tanstack/react-query'
import {listen} from '@tauri-apps/api/event'
import {useActor, useInterpret, useMachine} from '@xstate/react'
import {Allotment} from 'allotment'
import 'allotment/dist/style.css'
import {useEffect, useMemo, useRef, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Editor as SlateEditor} from 'slate'
import {ReactEditor} from 'slate-react'
import {
  Button,
  Comment,
  Link,
  MainWrapper,
  Pencil,
  ScrollView,
  SizableText,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'

import {assign, createMachine} from 'xstate'
import {PageProps} from './base'

export default function PublicationPage({mainActor}: PageProps) {
  if (mainActor.type !== 'publication')
    throw new Error('Publication page expects publication actor')
  const publicationActor = mainActor.actor
  const route = useNavRoute()
  const [debugValue, setDebugValue] = useState(false)
  const docId = route.key === 'publication' ? route.documentId : undefined
  const blockId = route.key === 'publication' ? route.blockId : undefined
  const versionId = route.key === 'publication' ? route.versionId : undefined

  let editor = useMemo(
    () => buildEditorHook(plugins, EditorMode.Publication),
    [],
  )

  let mouseService = useInterpret(() => mouseMachine)
  let scrollWrapperRef = useRef<HTMLDivElement>(null)

  // this checks if there's a block in the url, so we can highlight and scroll into the selected block
  let [focusBlock, setFocusBlock] = useState(() => blockId)
  useScrollToBlock(editor, scrollWrapperRef, focusBlock)

  const {data: changes} = useDocChanges(docId)
  const {data: citations} = useDocCitations(docId)

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

  let {activePanel} = resizablePanelState.context

  if (state.matches('errored')) {
    return (
      <YStack>
        <YStack gap="$3" alignItems="flex-start" maxWidth={500} padding="$8">
          <Text fontFamily="$body" fontWeight="700" fontSize="$6">
            Publication ERROR
          </Text>
          <Text fontFamily="$body" fontSize="$4">
            {state.context.errorMessage}
          </Text>
          <Button theme="yellow" onPress={() => send('PUBLICATION.FETCH.DATA')}>
            try again
          </Button>
        </YStack>
      </YStack>
    )
  }

  if (docId) {
    return (
      <ErrorBoundary
        fallback={<div>error</div>}
        onReset={() => window.location.reload()}
      >
        <ConversationsProvider
          documentId={docId}
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
            documentId={docId}
            onCitationsOpen={(citations: Array<MttLink>) => {
              panelSend({
                type: 'PANEL.OPEN',
                activePanel: 'citations',
              })
            }}
          >
            <MouseProvider value={mouseService}>
              <BlockHighLighter>
                <MainWrapper noScroll>
                  <Allotment
                    defaultSizes={[100]}
                    onChange={(values) =>
                      panelSend({type: 'PANEL.RESIZE', values})
                    }
                  >
                    <Allotment.Pane>
                      <YStack
                        height="100%"
                        // @ts-ignore
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
                        <ScrollView
                          onScroll={() => mouseService.send('DISABLE.SCROLL')}
                        >
                          <OutOfDateBanner
                            docId={state.context.documentId}
                            version={state.context.version}
                          />
                          {state.context.publication?.document?.content && (
                            <>
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
                              {import.meta.env.DEV && (
                                <YStack
                                  maxWidth="500px"
                                  marginHorizontal="auto"
                                >
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
                                          state.context.publication?.document
                                            .content,
                                          null,
                                          3,
                                        )}
                                      </SizableText>
                                    </XStack>
                                  )}
                                </YStack>
                              )}
                            </>
                          )}
                        </ScrollView>
                      </YStack>
                    </Allotment.Pane>
                    {resizablePanelState.context.show &&
                      !!state.context.publication && (
                        <Allotment.Pane preferredSize="35%">
                          <YStack height="100%">
                            <ScrollView>
                              {activePanel == 'conversations' ? (
                                <Conversations />
                              ) : activePanel == 'changes' ? (
                                <ChangesList />
                              ) : (
                                <Citations
                                  docId={state.context.publication.document.id}
                                  version={state.context.version}
                                />
                              )}
                            </ScrollView>
                          </YStack>
                        </Allotment.Pane>
                      )}
                  </Allotment>
                </MainWrapper>
                <Footer>
                  <FooterButton
                    active={activePanel == 'changes'}
                    label={`${changes?.changes?.length} Versions`}
                    icon={Pencil}
                    onPress={() => {
                      panelSend({type: 'PANEL.TOGGLE', activePanel: 'changes'})
                    }}
                  />
                  <FooterButton
                    active={activePanel == 'citations'}
                    label={`${citations?.links?.length} Citations`}
                    icon={Link}
                    onPress={() => {
                      panelSend({
                        type: 'PANEL.TOGGLE',
                        activePanel: 'citations',
                      })
                    }}
                  />
                  {features.comments ? (
                    <FooterButton
                      active={
                        activePanel == 'conversations' &&
                        resizablePanelState.context.show
                      }
                      label={`Conversations`}
                      icon={Comment}
                      onPress={() => {
                        panelSend({
                          type: 'PANEL.TOGGLE',
                          activePanel: 'conversations',
                        })
                      }}
                    />
                  ) : null}
                </Footer>
                {/* </div> */}
              </BlockHighLighter>
            </MouseProvider>
          </CitationsProvider>
        </ConversationsProvider>
      </ErrorBoundary>
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
            actions: ['hidePanel', 'resetActivePanel'],
          },
          {
            actions: ['showPanel', 'assignActivePanel'],
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
        // @ts-ignore
        resetActivePanel: assign({
          activePanel: undefined,
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

function OutOfDateBanner({docId, version}: {docId: string; version: string}) {
  const {data: pub, isLoading} = usePublication(docId)
  const navigate = useNavigate()
  const client = useQueryClient()
  if (isLoading) return null
  if (version === pub?.version) return null
  if (!pub?.version) return null
  return (
    <AppBanner
      onMouseEnter={() => {
        client.prefetchQuery({
          queryKey: [queryKeys.GET_PUBLICATION, docId, pub.version],
        })
      }}
    >
      <BannerText>
        <a
          onClick={(e) => {
            e.preventDefault()
            navigate({
              key: 'publication',
              documentId: docId,
              versionId: pub.version,
            })
          }}
        >
          There is a newer version of this Publication. Click here to go to
          latest version →
        </a>
      </BannerText>
    </AppBanner>
  )
}
