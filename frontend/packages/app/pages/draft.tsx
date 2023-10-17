import {AppBanner, BannerText} from '@mintter/app/components/app-banner'
import {DebugData} from '@mintter/app/components/debug-data'
import Footer from '@mintter/app/components/footer'
import {useDraftEditor} from '@mintter/app/models/documents'
import {useDaemonReady} from '@mintter/app/node-status-context'
import {useNavRoute} from '@mintter/app/utils/navigation'
import {HMEditorContainer, HyperMediaEditorView} from '@mintter/editor'
import {
  Button,
  Container,
  MainWrapper,
  SizableText,
  Theme,
  YStack,
} from '@mintter/ui'
import {useEffect, useState} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {useOpenDraft} from '../utils/open-draft'
import {DocumentPlaceholder} from './document-placeholder'

export default function DraftPage() {
  let route = useNavRoute()
  if (route.key != 'draft')
    throw new Error('Draft actor must be passed to DraftPage')

  const openDraft = useOpenDraft('replace')
  const [debugValue, setDebugValue] = useState(false)
  const documentId = route.draftId // TODO, clean this up when draftId != docId
  useEffect(() => {
    if (route.key === 'draft' && route.draftId === undefined) {
      openDraft()
    }
  }, [route])
  const {editor, query} = useDraftEditor(documentId, {
    onEditorState: setDebugValue,
  })

  console.log(`== ~ DraftPage ~ query:`, query)

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
