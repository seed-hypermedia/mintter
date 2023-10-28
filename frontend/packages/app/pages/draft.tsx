import {AppBanner, BannerText} from '@mintter/app/components/app-banner'
import Footer from '@mintter/app/components/footer'
import {useDaemonReady} from '@mintter/app/node-status-context'
import {useNavRoute} from '@mintter/app/utils/navigation'
import {trpc} from '@mintter/desktop/src/trpc'
import {HMEditorContainer, HyperMediaEditorView} from '@mintter/editor'
import {
  StateStream,
  blockStyles,
  useHeadingMarginStyles,
  useHeadingTextStyles,
  usePublicationContentContext,
} from '@mintter/shared'
import {
  Button,
  Spinner,
  Container,
  Input,
  MainWrapper,
  SizableText,
  Theme,
  XStack,
  XStackProps,
  Check,
  YStack,
  useStream,
  AlertCircle,
} from '@mintter/ui'
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {StateFrom} from 'xstate'
import {useDraftEditor, useDraftTitleInput} from '../models/documents'
import {draftMachine} from '../models/draft-machine'
import {useHasDevTools} from '../models/experiments'
import {useOpenDraft} from '../utils/open-draft'
import {DocumentPlaceholder} from './document-placeholder'
import {AppPublicationContentProvider} from './publication'

export default function DraftPage() {
  let route = useNavRoute()
  if (route.key != 'draft')
    throw new Error('Draft actor must be passed to DraftPage')

  const openDraft = useOpenDraft('replace')
  const documentId = route.draftId! // TODO, clean this up when draftId != docId
  useEffect(() => {
    if (route.key === 'draft' && route.draftId === undefined) {
      openDraft()
    }
  }, [route])

  let data = useDraftEditor({
    documentId: route.draftId,
    route,
  })

  if (data.state.matches('ready')) {
    return (
      <ErrorBoundary
        FallbackComponent={DraftError}
        onReset={() => window.location.reload()}
      >
        <MainWrapper>
          <AppPublicationContentProvider disableEmbedClick onCopyBlock={null}>
            <DraftStatus state={data.state} />
            <YStack id="editor-title">
              <DraftTitleInput
                draftId={data.draft?.id}
                onEnter={() => {
                  data.editor?._tiptapEditor?.commands?.focus?.('start')
                }}
              />
            </YStack>

            <HMEditorContainer>
              {data.editor && <HyperMediaEditorView editor={data.editor} />}
            </HMEditorContainer>
          </AppPublicationContentProvider>
          {documentId ? (
            <DraftDevTools
              draftId={documentId}
              editorState={data.editorStream}
            />
          ) : null}
        </MainWrapper>
        <Footer />
      </ErrorBoundary>
    )
  }
  return <DocumentPlaceholder />
}

function StatusWrapper({children, ...props}: PropsWithChildren<YStackProps>) {
  return (
    <YStack position="absolute" top={8} right={8} zIndex={1000} space="$2">
      {children}
    </YStack>
  )
}

function DraftStatus({state}: {state: StateFrom<typeof draftMachine>}) {
  let [errorInfo, toggleErrorInfo] = useState(false)
  let [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (state.matches({ready: 'saving'})) {
    }
  }, [state.value])

  if (state.matches({ready: 'saving'})) {
    return (
      <StatusWrapper>
        <Button size="$2" icon={<Spinner />}>
          saving...
        </Button>
      </StatusWrapper>
    )
  }

  if (state.matches({ready: 'idle'})) {
    return (
      <StatusWrapper>
        <Button size="$2" icon={<Check />} disabled>
          saved!
        </Button>
      </StatusWrapper>
    )
  }

  if (state.matches({ready: 'saveError'})) {
    return (
      <StatusWrapper alignItems="flex-end">
        <Button
          size="$2"
          theme="red"
          icon={<AlertCircle />}
          alignSelf="end"
          flex="none"
          onPress={() => toggleErrorInfo((v) => !v)}
        >
          Error
        </Button>
        {errorInfo ? (
          <YStack
            borderRadius="$3"
            padding="$2"
            maxWidth={200}
            backgroundColor="$backgroundStrong"
          >
            <SizableText size="$1">
              An error ocurred while trying to save the latest changes. please
              reload to make sure you do not loose any data.
            </SizableText>
          </YStack>
        ) : null}
      </StatusWrapper>
    )
  }
  return null
}

export function DraftPageOld() {
  let route = useNavRoute()
  if (route.key != 'draft')
    throw new Error('Draft actor must be passed to DraftPage')

  const openDraft = useOpenDraft('replace')
  const documentId = route.draftId! // TODO, clean this up when draftId != docId
  useEffect(() => {
    if (route.key === 'draft' && route.draftId === undefined) {
      openDraft()
    }
  }, [route])
  const {editor, query, editorState} = useDraftEditor(documentId)

  let isDaemonReady = useDaemonReady()

  if (editor && query.data) {
    return (
      <ErrorBoundary
        FallbackComponent={DraftError}
        onReset={() => window.location.reload()}
      >
        <MainWrapper>
          {!isDaemonReady ? <NotSavingBanner /> : null}
          <AppPublicationContentProvider disableEmbedClick onCopyBlock={null}>
            <YStack id="editor-title">
              <DraftTitleInput
                draftId={documentId}
                onEnter={() => {
                  editor?._tiptapEditor?.commands?.focus?.('start')
                }}
              />
            </YStack>

            <HMEditorContainer>
              {editor && <HyperMediaEditorView editor={editor} />}
            </HMEditorContainer>
          </AppPublicationContentProvider>
          {documentId ? (
            <DraftDevTools draftId={documentId} editorState={editorState} />
          ) : null}
        </MainWrapper>
        <Footer />
      </ErrorBoundary>
    )
  }

  if (editor && query.error) {
    return (
      <MainWrapper>
        <Container>
          <DraftError
            documentId={documentId}
            error={query.error}
            resetErrorBoundary={() => query.refetch()}
          />
        </Container>
      </MainWrapper>
    )
  }

  return <DocumentPlaceholder />
}

function DraftTitleInput({
  draftId,
  onEnter,
}: {
  draftId: string
  onEnter: () => void
}) {
  const {textUnit, layoutUnit} = usePublicationContentContext()
  let headingTextStyles = useHeadingTextStyles(1, textUnit)
  const {title, onTitle} = useDraftTitleInput(draftId)
  const input = useRef<HTMLTextAreaElement | null>(null)
  const headingMarginStyles = useHeadingMarginStyles(2, layoutUnit)

  let calcTitleSize = useCallback((title?: string) => {
    const target = input.current
    if (!target) return

    // first, apply the title in case it doesn't match. this will hapepn if the user pastes a newline, for example
    if (target.value !== title) {
      // only set the title if it doesn't match. because this will jump the cursor to the end of the input
      target.value = title || ''
    }

    // without this, the scrollHeight doesn't shrink, so when the user deletes a long title it doesnt shrink back
    target.style.height = ''

    // here is the actual auto-resize
    target.style.height = `${target.scrollHeight}px`
  }, [])

  useLayoutEffect(() => {
    window.addEventListener('resize', () => calcTitleSize(title))

    return () => {
      window.removeEventListener('resize', () => calcTitleSize(title))
    }
  }, [])
  useLayoutEffect(() => {
    calcTitleSize(title)
  }, [title, calcTitleSize])

  return (
    <YStack
    // paddingHorizontal={layoutUnit / 2}
    // $gtMd={{paddingHorizontal: layoutUnit}}
    >
      <XStack
        {...blockStyles}
        marginBottom={layoutUnit}
        paddingBottom={layoutUnit / 2}
        borderBottomColor="$color6"
        borderBottomWidth={1}
        paddingHorizontal={54}
        {...headingMarginStyles}
      >
        <Input
          // we use multiline so that we can avoid horizontal scrolling for long titles
          multiline
          // @ts-expect-error this will only work on web, where multiline TextInput is a HTMLTextAreaElement
          ref={input}
          onKeyPress={(e) => {
            if (e.nativeEvent.key == 'Enter') {
              e.preventDefault()
              onEnter()
            }
          }}
          size="$9"
          borderRadius="$1"
          borderWidth={0}
          overflow="hidden" // trying to hide extra content that flashes when pasting multi-line text into the title
          flex={1}
          backgroundColor="$color2"
          fontWeight="bold"
          fontFamily="$body"
          onChange={(e) => {
            // this is replicated in useLayoutEffect but we handle it here so that there is no layout thrashing when creating new lines
            calcTitleSize(title)
          }}
          outlineColor="transparent"
          borderColor="transparent"
          paddingLeft={9.6}
          defaultValue={title?.trim() || ''} // this is still a controlled input because of the value comparison in useLayoutEffect
          onChangeText={onTitle}
          placeholder="Untitled Document"
          {...headingTextStyles}
          padding={0}
        />
      </XStack>
    </YStack>
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

function NotSavingBanner() {
  return (
    <AppBanner>
      <BannerText>
        The Draft might not be saved because your Local peer is not ready (yet!)
      </BannerText>
    </AppBanner>
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
        borderWidth={1}
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
