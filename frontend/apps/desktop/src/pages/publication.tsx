import {AppBanner, BannerText} from '@app/app-banner'
import {features} from '@app/constants'
import {CitationsProvider} from '@app/editor/comments/citations-context'
import {ConversationsProvider} from '@app/editor/comments/conversations-context'
import {Editor, usePublicationEditor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {getEditorBlock} from '@app/editor/utils'
import {useDocChanges} from '@app/models/changes'
import {useDocCitations} from '@app/models/content-graph'
import {usePublication} from '@app/models/documents'
import {MouseProvider} from '@app/mouse-context'
import {mouseMachine} from '@app/mouse-machine'
import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {VersionsAccessory} from '@components/changes-list'
import {CitationsAccessory} from '@components/citations'
import {ConversationsAccessory} from '@components/conversations'
import Footer, {FooterButton} from '@components/footer'
import {Placeholder} from '@components/placeholder-box'
import {MttLink, pluralS} from '@mintter/shared'
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
import {useInterpret} from '@xstate/react'
import {Allotment} from 'allotment'
import 'allotment/dist/style.css'
import {useEffect, useRef, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Editor as SlateEditor} from 'slate'
import {ReactEditor} from 'slate-react'

import {useWindowListen} from '@app/ipc'
import {AppError} from '@app/root'

export default function PublicationPage() {
  const route = useNavRoute()
  if (route.key !== 'publication')
    throw new Error('Publication page expects publication actor')

  const [debugValue, setDebugValue] = useState(false)

  const docId = route?.documentId
  const versionId = route?.versionId
  const blockId = route?.blockId
  const accessory = route?.accessory
  const accessoryKey = accessory?.key
  const replace = useNavigate('replace')
  if (!docId)
    throw new Error(
      `Publication route does not contain docId: ${JSON.stringify(route)}`,
    )
  const {editor, state, value, editorKey} = usePublicationEditor(
    docId,
    versionId,
  )
  const {data, status, error, refetch} = state

  let mouseService = useInterpret(() => mouseMachine)
  let scrollWrapperRef = useRef<HTMLDivElement>(null)

  // this checks if there's a block in the url, so we can highlight and scroll into the selected block
  let [focusBlock] = useState(() => blockId)
  useScrollToBlock(editor, scrollWrapperRef, focusBlock)

  const {data: changes} = useDocChanges(status == 'success' ? docId : undefined)
  const {data: citations} = useDocCitations(
    status == 'success' ? docId : undefined,
  )

  useWindowListen('selector_click', (event) => {
    // TODO: send the conversationID through this event to highlight the appropiate conversation in the panel
    replace({...route, accessory: {key: 'comments'}})
  })

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
            replace({...route, accessory: {key: 'comments'}})
          }}
          publication={data}
        >
          <CitationsProvider
            documentId={docId}
            onCitationsOpen={(citations: Array<MttLink>) => {
              // todo, pass active citations into route
              replace({...route, accessory: {key: 'citations'}})
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
                        {value && (
                          <>
                            <Editor
                              key={editorKey}
                              editor={editor}
                              mode={EditorMode.Publication}
                              value={value}
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
                                      {JSON.stringify(value, null, 3)}
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
                  {accessoryKey &&
                    (accessoryKey == 'comments' ? (
                      <ConversationsAccessory />
                    ) : accessoryKey == 'versions' ? (
                      <VersionsAccessory />
                    ) : (
                      <CitationsAccessory docId={docId} version={versionId} />
                    ))}
                </Allotment>
              </MainWrapper>
              <Footer>
                <FooterButton
                  active={accessoryKey === 'versions'}
                  label={`${changes?.changes?.length} ${pluralS(
                    changes?.changes?.length,
                    'Version',
                  )}`}
                  icon={Pencil}
                  onPress={() => {
                    if (route.accessory)
                      return replace({...route, accessory: null})
                    replace({...route, accessory: {key: 'versions'}})
                  }}
                />
                {citations?.links?.length ? (
                  <FooterButton
                    active={accessoryKey === 'citations'}
                    label={`${citations?.links?.length} ${pluralS(
                      citations?.links?.length,
                      'Citation',
                    )}`}
                    icon={Link}
                    onPress={() => {
                      if (route.accessory)
                        return replace({...route, accessory: null})
                      replace({...route, accessory: {key: 'citations'}})
                    }}
                  />
                ) : null}
                {features.comments ? (
                  <FooterButton
                    active={accessoryKey === 'comments'}
                    label={`Conversations`}
                    icon={Comment}
                    onPress={() => {
                      if (route.accessory?.key === 'versions')
                        return replace({...route, accessory: null})
                      replace({...route, accessory: {key: 'comments'}})
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
  const {data: pub, isLoading} = usePublication({
    documentId: docId,
  })

  const navigate = useNavigate()
  const route = useNavRoute()
  const pubAccessory = route.key === 'publication' ? route.accessory : undefined
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
