import {AppBanner, BannerText} from '@mintter/app/src/components/app-banner'
import '@mintter/app/src/blocknote-core/style.css'
import {
  HDEditorContainer,
  HyperDocsEditorView,
} from '@mintter/app/src/editor/editor'
import {useDraftEditor} from '@mintter/app/src/models/documents'
import {useDaemonReady} from '@mintter/app/src/node-status-context'
import {useNavRoute} from '@mintter/app/src/utils/navigation'
import {DebugData} from '@mintter/app/src/components/debug-data'
import Footer from '@mintter/app/src/components/footer'
import {Button, Container, MainWrapper, Text, YStack} from '@mintter/ui'
import {useState} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'

export default function DraftPage() {
  let route = useNavRoute()
  if (route.key != 'draft')
    throw new Error('Draft actor must be passed to DraftPage')

  const [debugValue, setDebugValue] = useState(false)
  const documentId = route.draftId // TODO, clean this up when draftId != docId

  const {editor} = useDraftEditor(documentId, {
    onEditorState: setDebugValue,
  })

  let isDaemonReady = useDaemonReady()

  return (
    <ErrorBoundary
      FallbackComponent={DraftError}
      onReset={() => window.location.reload()}
    >
      <MainWrapper>
        <HDEditorContainer>
          {!isDaemonReady ? <NotSavingBanner /> : null}
          {editor && <HyperDocsEditorView editor={editor} />}
          {debugValue && <DebugData data={debugValue} />}
        </HDEditorContainer>
      </MainWrapper>
      <Footer />
    </ErrorBoundary>
  )
}

function NotSavingBanner() {
  return (
    <AppBanner>
      <BannerText>The Draft is not being saved right now.</BannerText>
    </AppBanner>
  )
}

function DraftError({error, resetErrorBoundary}: FallbackProps) {
  return (
    <Container>
      <YStack role="alert" space>
        <Text fontWeight="800">Draft Error:</Text>
        <Text tag="pre">{error.message}</Text>
        <Button onPress={resetErrorBoundary}>Try again</Button>
      </YStack>
    </Container>
  )
}
