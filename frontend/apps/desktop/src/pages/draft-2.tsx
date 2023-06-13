import {AppBanner, BannerText} from '@app/app-banner'
import {useDraftEditor2} from '@app/models/documents'
import {useDaemonReady} from '@app/node-status-context'
import {AppError} from '@app/root'
import {useNavRoute} from '@app/utils/navigation'
import Footer from '@components/footer'
import '@blocknote/core/style.css'
import {MainWrapper} from '@mintter/ui'
import {useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {HDEditorContainer, HyperDocsEditorView} from '@app/editor/editor'
import {DebugData} from '@components/debug-data'

export default function DraftPage() {
  let route = useNavRoute()
  if (route.key != 'draft')
    throw new Error('Draft actor must be passed to DraftPage')

  const [debugValue, setDebugValue] = useState(false)
  const documentId = route.draftId // TODO, clean this up when draftId != docId

  const {editor} = useDraftEditor2(documentId, {
    onEditorState: setDebugValue,
  })

  let isDaemonReady = useDaemonReady()

  return (
    <ErrorBoundary
      FallbackComponent={AppError}
      onReset={() => window.location.reload()}
    >
      <MainWrapper>
        <HDEditorContainer>
          {!isDaemonReady ? <NotSavingBanner /> : null}
          <HyperDocsEditorView editor={editor} />
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
