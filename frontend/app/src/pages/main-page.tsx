import {useMain} from '@app/main-context'
import {PageError, rootPageStyle} from '@app/pages/window-components'
import {Box} from '@components/box'
import {Library} from '@components/library'
import {Settings} from '@components/settings'
import {Topbar} from '@components/topbar'
import {useActor} from '@xstate/react'
import {ErrorBoundary} from 'react-error-boundary'
import {DraftList} from './draft-list-page'
import EditorPage from './editor'
import Publication from './publication'
import {PublicationList} from './publication-list-page'

export default function MainPage() {
  const mainService = useMain()
  const [state] = useActor(mainService)
  console.log('main state', state.context.currentFile)

  if (state.matches('routes.settings')) {
    return <Settings />
  }

  return (
    <Box className={rootPageStyle()}>
      <ErrorBoundary
        FallbackComponent={PageError}
        onReset={() => {
          window.location.reload()
        }}
      >
        <Library />
        <Topbar />
        {state.matches('routes.publication') ? (
          <Publication />
        ) : state.matches('routes.editor') ? (
          <EditorPage key={state.context.params.docId} />
        ) : null}
        {state.matches('routes.home') && <PublicationList />}
        {state.matches('routes.draftList') && <DraftList />}
        {state.matches('routes.publicationList') ? <PublicationList /> : null}
      </ErrorBoundary>
    </Box>
  )
}

var CurrentView = {
  PUBLICATION: Publication,
  DRAFT: EditorPage,
  HOME: PublicationList,
  DRAFTLIST: DraftList,
  PUBLICATIONLIST: PublicationList,
}
