import {AppBanner, BannerText} from '@app/app-banner'
import {features} from '@app/constants'
import {CitationsProvider} from '@app/editor/comments/citations-context'
import {ConversationsProvider} from '@app/editor/comments/conversations-context'
import {Editor} from '@app/editor/editor'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {getEditorBlock} from '@app/editor/utils'
import {useDocChanges} from '@app/models/changes'
import {useDocCitations} from '@app/models/content-graph'
import {usePublication} from '@app/models/documents'
import {MouseProvider} from '@app/mouse-context'
import {mouseMachine} from '@app/mouse-machine'
import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {Box} from '@components/box'
import {ChangesList} from '@components/changes-list'
import {Citations} from '@components/citations'
import {Conversations} from '@components/conversations'
import Footer, {FooterButton} from '@components/footer'
import {Placeholder} from '@components/placeholder-box'
import {
  blockNodeToSlate,
  group,
  MttLink,
  paragraph,
  statement,
  text,
} from '@mintter/shared'
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
import {useQueryClient} from '@tanstack/react-query'
import {listen} from '@tauri-apps/api/event'
import {useInterpret} from '@xstate/react'
import {Allotment} from 'allotment'
import 'allotment/dist/style.css'
import {useEffect, useMemo, useRef, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Editor as SlateEditor} from 'slate'
import {ReactEditor} from 'slate-react'

import {AppError} from '@app/root'

function pluralS(length = 0) {
  return length === 1 ? '' : 's'
}

let emptyEditor = group({data: {parent: ''}}, [
  statement({id: ''}, [paragraph([text('')])]),
])

export default function PublicationPage() {
  const route = useNavRoute()
  if (route.key !== 'publication')
    throw new Error('Publication page expects publication actor')

  const [debugValue, setDebugValue] = useState(false)
  const pubRoute = route.key === 'publication' ? route : undefined
  const docId = pubRoute?.documentId
  const versionId = pubRoute?.versionId
  const blockId = pubRoute?.blockId
  const accessory = pubRoute?.accessory
  const accessoryKey = accessory?.key
  const replace = useNavigate('replace')
  if (!docId)
    throw new Error(
      `Publication route does not contain docId: ${JSON.stringify(pubRoute)}`,
    )
  const {data, status, error, refetch} = usePublication(docId, versionId)

  let editorValue = useMemo(() => {
    if (status == 'success' && data.document?.children.length) {
      return [blockNodeToSlate(data.document?.children, 'group')]
    }

    return [emptyEditor]
  }, [docId, data, status])

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
      pubRoute && replace({...pubRoute, accessory: {key: 'comments'}})
    }).then((f) => (unlisten = f))

    return () => unlisten?.()
  }, [])

  if (status == 'error') {
    return (
      <YStack>
        <YStack gap="$3" alignItems="flex-start" maxWidth={500} padding="$8">
          <Text fontFamily="$body" fontWeight="700" fontSize="$6">
            Publication ERROR
          </Text>
          <Text fontFamily="$body" fontSize="$4">
            {JSON.stringify(error)}
          </Text>
          <Button theme="yellow" onPress={() => refetch()}>
            try again
          </Button>
        </YStack>
      </YStack>
    )
  }

  if (status == 'success') {
    return (
      <ErrorBoundary
        FallbackComponent={AppError}
        onReset={() => window.location.reload()}
      >
        <ConversationsProvider
          documentId={docId}
          isOpen={accessoryKey === 'comments'}
          onConversationsOpen={() => {
            // todo, pass clicked on conversation into route
            replace({...pubRoute, accessory: {key: 'comments'}})
          }}
          publication={data}
        >
          <CitationsProvider
            documentId={docId}
            onCitationsOpen={(citations: Array<MttLink>) => {
              // todo, pass active citations into route
              replace({...pubRoute, accessory: {key: 'citations'}})
            }}
          >
            <MouseProvider value={mouseService}>
              <MainWrapper noScroll>
                <Allotment defaultSizes={[100]} onChange={(values) => {}}>
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
                        {versionId && (
                          <OutOfDateBanner docId={docId} version={versionId} />
                        )}
                        {editorValue && (
                          <>
                            <Editor
                              editor={editor}
                              mode={EditorMode.Publication}
                              value={editorValue}
                              onChange={() => {
                                mouseService.send('DISABLE.CHANGE')
                                // noop
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
                                      {JSON.stringify(editorValue, null, 3)}
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
                  {accessoryKey && (
                    <Allotment.Pane preferredSize="35%">
                      <YStack height="100%">
                        <ScrollView>
                          {accessoryKey == 'comments' ? (
                            <Conversations />
                          ) : accessoryKey == 'versions' ? (
                            <ChangesList />
                          ) : (
                            <Citations docId={docId} version={versionId} />
                          )}
                        </ScrollView>
                      </YStack>
                    </Allotment.Pane>
                  )}
                </Allotment>
              </MainWrapper>
              <Footer>
                <FooterButton
                  active={accessoryKey === 'versions'}
                  label={`${changes?.changes?.length} Version${pluralS(
                    changes?.changes?.length,
                  )}`}
                  icon={Pencil}
                  onPress={() => {
                    if (pubRoute.accessory)
                      return replace({...pubRoute, accessory: null})
                    replace({...pubRoute, accessory: {key: 'versions'}})
                  }}
                />
                <FooterButton
                  active={accessoryKey === 'citations'}
                  label={`${citations?.links?.length} Citation${pluralS(
                    citations?.links?.length,
                  )}`}
                  icon={Link}
                  onPress={() => {
                    if (pubRoute.accessory)
                      return replace({...pubRoute, accessory: null})
                    replace({...pubRoute, accessory: {key: 'citations'}})
                  }}
                />
                {features.comments ? (
                  <FooterButton
                    active={accessoryKey === 'comments'}
                    label={`Conversations`}
                    icon={Comment}
                    onPress={() => {
                      if (pubRoute.accessory?.key === 'versions')
                        return replace({...pubRoute, accessory: null})
                      replace({...pubRoute, accessory: {key: 'comments'}})
                    }}
                  />
                ) : null}
              </Footer>
            </MouseProvider>
          </CitationsProvider>
        </ConversationsProvider>
      </ErrorBoundary>
    )
  }

  return (
    <>
      <PublicationShell />

      {/* <p
        className={classnames('publication-fetching-message', {
          visible: state.matches('fetching.extended'),
        })}
      >
        Searching the network...
      </p> */}
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
  const route = useNavRoute()
  const pubAccessory = route.key === 'publication' ? route.accessory : undefined
  const client = useQueryClient()
  if (isLoading) return null
  if (version === pub?.version) return null
  if (!pub?.version) return null
  return (
    <AppBanner onMouseEnter={() => {}}>
      <BannerText>
        <a
          onClick={(e) => {
            e.preventDefault()
            navigate({
              key: 'publication',
              documentId: docId,
              versionId: pub.version,
              accessory: pubAccessory,
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
