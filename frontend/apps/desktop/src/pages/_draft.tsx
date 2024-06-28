import Footer from '@/components/footer'
import {MainWrapper} from '@/components/main-wrapper'
import {subscribeDraftFocus} from '@/draft-focusing'
import {BlockNoteEditor, getBlockInfoFromPos} from '@/editor'
import {useMyAccount_deprecated} from '@/models/accounts'
import {useDraftEditor} from '@/models/documents'
import {draftMachine} from '@/models/draft-machine'
import {useHasDevTools} from '@/models/experiments'
import {useGatewayUrl} from '@/models/gateway-settings'
import {trpc} from '@/trpc'
import {
  chromiumSupportedImageMimeTypes,
  chromiumSupportedVideoMimeTypes,
  generateBlockId,
  handleDragMedia,
} from '@/utils/media-drag'
import {useNavRoute} from '@/utils/navigation'
import {useOpenDraft} from '@/utils/open-draft'
import {DraftRoute} from '@/utils/routes'
import {
  BlockRange,
  ExpandedBlockRange,
  StateStream,
  blockStyles,
  createPublicWebHmUrl,
  formattedDateMedium,
  unpackDocId,
  useDocContentContext,
  useHeadingMarginStyles,
  useHeadingTextStyles,
} from '@shm/shared'
import {
  Button,
  Input,
  SizableText,
  Theme,
  XStack,
  YStack,
  copyUrlToClipboardWithFeedback,
  useStream,
} from '@shm/ui'
import {useSelector} from '@xstate/react'
import {useEffect, useRef, useState} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {HMEditorContainer, HyperMediaEditorView} from 'src/components/editor'
import {ActorRefFrom} from 'xstate'
import {AppDocContentProvider} from './document-content-provider'

export default function DraftPage() {
  let route = useNavRoute()
  if (route.key != 'draft') throw new Error('DraftPage must have draft route')
  const openDraft = useOpenDraft('replace')
  const draftId = route.id! // TODO, clean this up when draftId != docId
  const [isDragging, setIsDragging] = useState(false)
  const importWebFile = trpc.webImporting.importWebFile.useMutation()
  const gwUrl = useGatewayUrl()
  // const fixedTitle = useFixedDraftTitle(route)

  // const isSaved = DraftStatusContext.useSelector((s) => s.matches('saved'))

  let data = useDraftEditor({
    id: route.draftId,
  })

  // const {shouldRebase, newVersion} = useDraftRebase({

  console.log(`== ~ DraftPage ~ data:`, data)

  //   shouldCheck:
  //     (data.draft?.previousVersion && data.state.matches('ready')) || false,
  //   draft: data.draft,
  // })

  useEffect(() => {
    return subscribeDraftFocus(draftId, (blockId: string) => {
      if (data.editor) {
        data.editor._tiptapEditor.commands.focus()

        data.editor.setTextCursorPosition(blockId, 'start')
      }
    })
  }, [data.editor, draftId])

  // if (data.state.matches('ready')) {
  if (data.editor.ready) {
    return (
      <ErrorBoundary
        FallbackComponent={DraftError}
        onReset={() => window.location.reload()}
      >
        <MainWrapper
          // @ts-ignore
          onDragStart={(event) => {
            setIsDragging(true)
          }}
          onDragEnd={(event) => {
            setIsDragging(false)
          }}
          onDragOver={(event) => {
            setIsDragging(true)
            event.preventDefault()
          }}
          onDrop={(event: DragEvent) => {
            if (!isDragging) return
            const dataTransfer = event.dataTransfer

            if (dataTransfer) {
              const ttEditor = (data.editor as BlockNoteEditor)._tiptapEditor
              const files: File[] = []

              if (dataTransfer.files.length) {
                for (let i = 0; i < dataTransfer.files.length; i++) {
                  files.push(dataTransfer.files[i])
                }
              } else if (dataTransfer.items.length) {
                for (let i = 0; i < dataTransfer.items.length; i++) {
                  const item = dataTransfer.items[i].getAsFile()
                  if (item) {
                    files.push(item)
                  }
                }
              }

              if (files.length > 0) {
                const editorElement = document.getElementsByClassName(
                  'mantine-Editor-root',
                )[0]
                const editorBoundingBox = editorElement.getBoundingClientRect()
                const pos = ttEditor.view.posAtCoords({
                  left: editorBoundingBox.left + editorBoundingBox.width / 2,
                  top: event.clientY,
                })

                let lastId: string

                // using reduce so files get inserted sequentially
                files
                  .reduce((previousPromise, file, index) => {
                    return previousPromise.then(() => {
                      event.preventDefault()
                      event.stopPropagation()

                      if (pos && pos.inside !== -1) {
                        return handleDragMedia(file).then((props) => {
                          if (!props) return false

                          const {state} = ttEditor.view
                          let blockNode
                          const newId = generateBlockId()

                          if (chromiumSupportedImageMimeTypes.has(file.type)) {
                            blockNode = {
                              id: newId,
                              type: 'image',
                              props: {
                                url: props.url,
                                name: props.name,
                              },
                            }
                          } else if (
                            chromiumSupportedVideoMimeTypes.has(file.type)
                          ) {
                            blockNode = {
                              id: newId,
                              type: 'video',
                              props: {
                                url: props.url,
                                name: props.name,
                              },
                            }
                          } else {
                            blockNode = {
                              id: newId,
                              type: 'file',
                              props: {
                                ...props,
                              },
                            }
                          }

                          const blockInfo = getBlockInfoFromPos(
                            state.doc,
                            pos.pos,
                          )

                          if (index === 0) {
                            ;(data.editor as BlockNoteEditor).insertBlocks(
                              [blockNode],
                              blockInfo.id,
                              blockInfo.node.textContent ? 'after' : 'before',
                            )
                          } else {
                            ;(data.editor as BlockNoteEditor).insertBlocks(
                              [blockNode],
                              lastId,
                              'after',
                            )
                          }

                          lastId = newId
                        })
                      }
                    })
                  }, Promise.resolve())
                  .then(() => true)
                setIsDragging(false)
                return true
              }
              setIsDragging(false)
              return false
            }
            setIsDragging(false)

            return false
          }}
        >
          <XStack>
            <YStack f={1} onPress={data.handleFocusAtMousePos}>
              {/* {shouldRebase ? (
                <XStack
                  padding="$4"
                  top={0}
                  zIndex={100}
                  style={{position: 'sticky'}}
                >
                  <XStack
                    theme="yellow"
                    flex={1}
                    paddingHorizontal="$4"
                    paddingVertical="$2"
                    borderRadius="$3"
                    backgroundColor="$background"
                    alignItems="center"
                    gap="$4"
                    borderColor="$color6"
                    borderWidth={1}
                  >
                    <XStack flexGrow={0} flexShrink={0}>
                      <FileWarning color="$color10" size={12} />
                    </XStack>
                    <XStack flex={1}>
                      <SizableText color="$color11">
                        A new version of this document was found. do you want to
                        base your changes on this new version?
                      </SizableText>
                    </XStack>
                    <YStack
                      gap="$2"
                      ai="center"
                      $gtSm={{
                        flexDirection: 'row',
                      }}
                    >
                      <Button
                        $sm={{
                          alignSelf: 'stretch',
                        }}
                        size="$2"
                        onPress={() =>
                          navigate({
                            key: 'draft-rebase',
                            documentId,
                            sourceVersion: data.draft!.previousVersion!,
                            targetVersion: newVersion,
                          })
                        }
                        // onPress={autoRebase}
                      >
                        Rebase and Review
                      </Button>
                    </YStack>
                  </XStack>
                </XStack>
              ) : null} */}
              <AppDocContentProvider
                disableEmbedClick
                onCopyBlock={(
                  blockId: string,
                  blockRange: BlockRange | ExpandedBlockRange | undefined,
                ) => {
                  if (route.key != 'draft')
                    throw new Error('DraftPage must have draft route')
                  if (!route.draftId)
                    throw new Error('draft route draftId is missing')
                  const id = unpackDocId(route.draftId)
                  if (!id?.eid)
                    throw new Error(
                      'eid could not be extracted from draft route',
                    )
                  copyUrlToClipboardWithFeedback(
                    createPublicWebHmUrl('d', id.eid, {
                      blockRef: blockId,
                      blockRange,
                      hostname: gwUrl.data,
                    }),
                    'Block',
                  )
                }}
                importWebFile={importWebFile}
              >
                {/** TODO: Add the state when machine is ready */}
                {/* {data.state.matches({ready: 'saveError'}) ? (
                  <XStack padding="$4" position="sticky" top={0} zIndex={100}>
                    <XStack
                      flex={1}
                      paddingHorizontal="$4"
                      paddingVertical="$2"
                      borderRadius="$3"
                      backgroundColor="$red4"
                      alignItems="center"
                      gap="$4"
                      borderColor="$color6"
                      borderWidth={1}
                    >
                      <XStack flexGrow={0} flexShrink={0}>
                        <ErrorIcon color="$red11" size={12} />
                      </XStack>
                      <XStack flex={1}>
                        <SizableText color="$red11">
                          Oh No! Your draft is in a corrupt state. Need to
                          restore or reset :(
                        </SizableText>
                      </XStack>
                      <YStack
                        gap="$2"
                        ai="center"
                        $gtSm={{
                          flexDirection: 'row',
                        }}
                      >
                        {data.state.context.restoreTries == 0 ? (
                          <Tooltip content="This will remove all the current changes you made to the draft and will try to restore the last saved draft">
                            <Button
                              // backgroundColor="$red5"
                              // color="$red11"
                              // borderColor="$red7"
                              // hoverStyle={{
                              //   backgroundColor: '$red11',
                              //   color: '$red1',
                              //   borderColor: '$red7',
                              // }}
                              size="$2"
                              onPress={() => data.send({type: 'RESTORE.DRAFT'})}
                              $sm={{
                                alignSelf: 'stretch',
                              }}
                            >
                              Restore to previous saved state
                            </Button>
                          </Tooltip>
                        ) : (
                          <SizableText
                            size="$2"
                            fontWeight="600"
                            color="$red11"
                          >
                            Restore failed
                          </SizableText>
                        )}
                        <Tooltip content="It will remove all the changes made to this draft and reset to the original state of it. If it was an Empty draft, it will delete all its content. IF you started from another document, it will reset to that document state.">
                          <Button
                            // backgroundColor="$red5"
                            // color="$red11"
                            // borderColor="$red7"
                            // hoverStyle={{
                            //   backgroundColor: '$red11',
                            //   color: '$red1',
                            //   borderColor: '$red7',
                            // }}
                            $sm={{
                              alignSelf: 'stretch',
                            }}
                            size="$2"
                            onPress={() => data.send({type: 'RESET.DRAFT'})}
                          >
                            Reset to the initial state
                          </Button>
                        </Tooltip>
                      </YStack>
                    </XStack>
                  </XStack>
                ) : null} */}
                <YStack
                  id="editor-title"
                  onPress={(e) => {
                    e.stopPropagation()
                  }}
                  // style={{border: '1px solid green'}}
                >
                  {/* <DraftTitleInput
                    // fixedTitle={fixedTitle}
                    draftActor={data.actor}
                    onEnter={() => {
                      data.editor?._tiptapEditor?.commands?.focus?.('start')
                    }}
                  /> */}
                </YStack>
                <HMEditorContainer>
                  {data.editor && data.editor.topLevelBlocks.length ? (
                    <HyperMediaEditorView
                      // editable={!data.state.matches({ready: 'saveError'})}
                      editable={true}
                      editor={data.editor}
                    />
                  ) : null}
                </HMEditorContainer>
              </AppDocContentProvider>
            </YStack>
          </XStack>
          {draftId ? (
            <DraftDevTools draftId={draftId} editorState={data.editorStream} />
          ) : null}
        </MainWrapper>
        <Footer>
          <XStack gap="$3" marginHorizontal="$3">
            {data.draft?.updateTime && (
              <SizableText size="$1" color={isSaved ? '$color' : '$color9'}>
                Last update: {formattedDateMedium(data.draft.updateTime)}
              </SizableText>
            )}
          </XStack>
        </Footer>
      </ErrorBoundary>
    )
  }

  if (data.state.matches('error')) {
    return (
      <MainWrapper>
        <XStack jc="center" ai="center" f={1} backgroundColor={'$color2'}>
          <YStack
            space
            theme="red"
            backgroundColor="$color1"
            maxWidth={500}
            marginVertical="$7"
            padding="$4"
            f={1}
            borderRadius="$4"
          >
            <SizableText size="$5" fontWeight="bold" color="$red10">
              Sorry, this drafts appears to be corrupt
            </SizableText>

            <SizableText size="$2">
              Well, this is embarrasing. for some reason we are not able to load
              this draft due to a internal problem in the draft changes. TODO.
            </SizableText>

            <XStack jc="center">
              <Button
                size="$2"
                onPress={() => {
                  data.send({type: 'RESET.CORRUPT.DRAFT'})
                }}
              >
                Reset Draft
              </Button>
            </XStack>
          </YStack>
        </XStack>
      </MainWrapper>
    )
  }

  // console.log('=== DATA', data.state.value)

  // if (data.state.matches('waiting')) {
  //   return <DocumentPlaceholder />
  // }

  return null
}

function applyTitleResize(target: HTMLTextAreaElement) {
  // without this, the scrollHeight doesn't shrink, so when the user deletes a long title it doesnt shrink back
  target.style.height = ''

  // here is the actual auto-resize
  target.style.height = `${target.scrollHeight}px`
}

export function useFixedDraftTitle(route: DraftRoute) {
  const myAccount = useMyAccount_deprecated()

  let fixedTitle: string | undefined = undefined
  if (route.isProfileDocument) {
    const myAlias = myAccount.data?.profile?.alias
    fixedTitle = myAlias ? `${myAlias} Home` : 'My Account Home'
  }
  return fixedTitle
}

export function DraftTitleInput({
  fixedTitle,
  onEnter,
  draftActor,
  disabled = false,
}: {
  fixedTitle?: string
  onEnter: () => void
  draftActor: ActorRefFrom<typeof draftMachine>
  disabled?: boolean
}) {
  const {textUnit, layoutUnit} = useDocContentContext()
  let headingTextStyles = useHeadingTextStyles(1, textUnit)
  const title = useSelector(draftActor, (s) => s.context.draft?.title || '')

  const input = useRef<HTMLTextAreaElement | null>(null)
  const headingMarginStyles = useHeadingMarginStyles(2, layoutUnit)

  useEffect(() => {
    // handle the initial size of the title
    const target = input.current
    if (!target) return
    applyTitleResize(target)
  }, [input.current])

  useEffect(() => {
    if (fixedTitle) return
    const target = input.current
    if (!target) return
    if (target.value !== title) {
      // handle cases where the model has a different title. this happens when pasting multiline text into the title
      target.value = title || ''
      applyTitleResize(target)
    }
  }, [title, fixedTitle])

  useEffect(() => {
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }

    function handleResize() {
      // handle the resize size of the title, responsive size may be changed
      const target = input.current
      if (!target) return
      applyTitleResize(target)
    }
  }, [input.current])

  return (
    <XStack
      flex="none"
      {...blockStyles}
      marginBottom={layoutUnit}
      paddingBottom={layoutUnit / 2}
      borderBottomColor="$color6"
      borderBottomWidth={1}
      paddingHorizontal={54}
      {...headingMarginStyles}
    >
      <Input
        disabled={disabled}
        // we use multiline so that we can avoid horizontal scrolling for long titles
        multiline
        ref={input}
        onKeyPress={(e) => {
          if (e.nativeEvent.key == 'Enter') {
            e.preventDefault()
            onEnter()
          }
        }}
        size="$9"
        readOnly={!!fixedTitle}
        borderRadius="$1"
        borderWidth={0}
        overflow="hidden" // trying to hide extra content that flashes when pasting multi-line text into the title
        flex={1}
        backgroundColor="$color2"
        fontWeight="bold"
        fontFamily="$body"
        onChange={(e) => {
          applyTitleResize(e.target as HTMLTextAreaElement)
        }}
        outlineColor="transparent"
        borderColor="transparent"
        paddingLeft={9.6}
        defaultValue={fixedTitle || title?.trim() || ''} // this is still a controlled input because of the value comparison in useLayoutEffect
        // value={title}
        onChangeText={(title) => {
          // TODO: change title here
          draftActor.send({type: 'CHANGE', title})
        }}
        placeholder="Untitled Document"
        {...headingTextStyles}
        padding={0}
      />
    </XStack>
  )
}

function DraftDevTools({
  draftId,
  editorState,
}: {
  draftId: string
  editorState: StateStream<any>
}) {
  const hasDevTools = useHasDevTools()
  const openDraft = trpc.diagnosis.openDraftLog.useMutation()
  const [debugValue, setShowValue] = useState(false)
  const editorValue = useStream(editorState)
  if (!hasDevTools) return null
  return (
    <YStack alignSelf="stretch">
      <XStack space="$4" margin="$4">
        <Button
          size="$2"
          theme="orange"
          onPress={() => {
            openDraft.mutate(draftId)
          }}
        >
          Open Draft Log
        </Button>
        <Button
          theme="orange"
          size="$2"
          onPress={() => setShowValue((v) => !v)}
        >
          {debugValue ? 'Hide Draft Value' : 'Show Draft Value'}
        </Button>
      </XStack>
      {debugValue && (
        <code style={{whiteSpace: 'pre-wrap'}}>
          {JSON.stringify(editorValue, null, 2)}
        </code>
      )}
    </YStack>
  )
}

function DraftError({
  documentId,
  error,
  resetErrorBoundary,
}: FallbackProps & {documentId: string}) {
  return (
    <Theme name="red">
      <YStack
        marginVertical="$8"
        padding="$4"
        borderRadius="$5"
        borderColor="$color5"
        borderWidth={2}
        backgroundColor="$color3"
        gap="$3"
        alignItems="center"
      >
        <SizableText size="$4" textAlign="center" color="$color9">
          Error loading Draft (Document Id: {documentId})
        </SizableText>
        <SizableText color="$color8" size="$2" fontFamily="$mono">
          {JSON.stringify(error)}
        </SizableText>
        <Button size="$3" onPress={() => resetErrorBoundary()}>
          Retry
        </Button>
      </YStack>
    </Theme>
  )
}
