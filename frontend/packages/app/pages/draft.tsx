import {AppBanner, BannerText} from '@mintter/app/components/app-banner'
import Footer from '@mintter/app/components/footer'
import {useDraftEditor} from '@mintter/app/models/documents'
import {useDaemonReady} from '@mintter/app/node-status-context'
import {useNavRoute} from '@mintter/app/utils/navigation'
import {trpc} from '@mintter/desktop/src/trpc'
import {HMEditorContainer, HyperMediaEditorView} from '@mintter/editor'
import {
  StateStream,
  blockStyles,
  useHeadingTextStyles,
  usePublicationContentContext,
} from '@mintter/shared'
import {
  Button,
  Container,
  Input,
  MainWrapper,
  SizableText,
  Theme,
  XStack,
  YStack,
  useStream,
} from '@mintter/ui'
import {useEffect, useState} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {useDraftTitleInput} from '../models/documents'
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
            <YStack className="editor-title">
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

  return (
    <YStack
    // paddingHorizontal={layoutUnit / 2}
    // $gtMd={{paddingHorizontal: layoutUnit}}
    >
      <YStack
        {...blockStyles}
        marginBottom={layoutUnit}
        paddingBottom={layoutUnit / 2}
        borderBottomColor="$color6"
        borderBottomWidth={1}
        paddingHorizontal={54}
      >
        <Input
          onKeyPress={(e) => {
            if (e.nativeEvent.key == 'Enter') {
              e.preventDefault()
              onEnter()
            }
          }}
          multiline
          size="$9"
          borderRadius={0}
          borderWidth={0}
          backgroundColor="$color2"
          fontWeight="bold"
          fontFamily="$body"
          value={title || ''}
          outlineColor="transparent"
          borderColor="transparent"
          f={1}
          paddingLeft={9.6}
          onChangeText={onTitle}
          placeholder="Untitled Document"
          {...headingTextStyles}
        />
      </YStack>
    </YStack>
  )

  return (
    <Input
      multiline
      size="$9"
      borderRadius={0}
      borderWidth={0}
      backgroundColor="$color2"
      fontWeight="bold"
      fontFamily={'$body'}
      value={title || ''}
      outlineColor="transparent"
      borderColor="transparent"
      f={1}
      maxWidth={640}
      paddingLeft={9.6}
      marginLeft={54}
      marginRight={54}
      onChangeText={onTitle}
      placeholder="Untitled Document"
    />
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
