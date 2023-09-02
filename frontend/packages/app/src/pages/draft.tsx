import {AppBanner, BannerText} from '@mintter/app/src/components/app-banner'
import '@mintter/app/src/blocknote-core/style.css'
import {
  HMEditorContainer,
  HyperMediaEditorView,
} from '@mintter/app/src/editor/editor'
import {useDraftEditor} from '@mintter/app/src/models/documents'
import {useDaemonReady} from '@mintter/app/src/node-status-context'
import {useNavRoute} from '@mintter/app/src/utils/navigation'
import {DebugData} from '@mintter/app/src/components/debug-data'
import Footer from '@mintter/app/src/components/footer'
import {
  Button,
  Container,
  MainWrapper,
  SizableText,
  Text,
  Theme,
  YStack,
} from '@mintter/ui'
import {useState} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {DocumentPlaceholder} from './document-placeholder'

export default function DraftPage() {
  let route = useNavRoute()
  if (route.key != 'draft')
    throw new Error('Draft actor must be passed to DraftPage')

  const [debugValue, setDebugValue] = useState(false)
  const documentId = route.draftId // TODO, clean this up when draftId != docId

  const {editor, query} = useDraftEditor(documentId, {
    onEditorState: setDebugValue,
  })

  let isDaemonReady = useDaemonReady()

  if (editor && query.data) {
    return (
      <ErrorBoundary
        FallbackComponent={DraftError}
        onReset={() => window.location.reload()}
      >
        <MainWrapper>
          {!isDaemonReady ? <NotSavingBanner /> : null}
          <HMEditorContainer>
            {editor && <HyperMediaEditorView editor={editor} />}
            {debugValue && <DebugData data={debugValue} />}
          </HMEditorContainer>
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

function NotSavingBanner() {
  return (
    <AppBanner>
      <BannerText>The Draft is not being saved right now.</BannerText>
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
