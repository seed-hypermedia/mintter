import {useMain, useParams} from '@app/main-context'
import {PageError, rootPageStyle} from '@app/pages/window-components'
import {Box} from '@components/box'
import {Library} from '@components/library'
import {libraryMachine} from '@components/library/library-machine'
import {Settings} from '@components/settings'
import {Topbar} from '@components/topbar'
import {useInterpret, useSelector} from '@xstate/react'
import {ErrorBoundary} from 'react-error-boundary'
import {DraftList} from './draft-list-page'
import EditorPage from './editor'
import Publication from './publication'
import {PublicationList} from './publication-list-page'

export default function MainPage() {
  const mainService = useMain()

  const params = useParams()
  const isPublication = useSelector(mainService, (state) =>
    state.matches('routes.publication'),
  )
  const isEditor = useSelector(mainService, (state) =>
    state.matches('routes.editor'),
  )
  const isPublicationList = useSelector(mainService, (state) =>
    state.matches('routes.publicationList'),
  )
  const isDraftList = useSelector(mainService, (state) =>
    state.matches('routes.draftList'),
  )
  const isHome = useSelector(mainService, (state) =>
    state.matches('routes.home'),
  )
  const isSettings = useSelector(mainService, (state) =>
    state.matches('routes.settings'),
  )

  const libraryService = useInterpret(() => libraryMachine)
  if (isSettings) {
    return <Settings />
  }

  return (
    <>
      <Box className={rootPageStyle()}>
        <ErrorBoundary
          FallbackComponent={PageError}
          onReset={() => {
            window.location.reload()
          }}
        >
          {isPublication ? (
            <Publication key={params.docId} />
          ) : isEditor ? (
            <EditorPage key={params.docId} />
          ) : null}
          {isHome && <PublicationList />}
          {isDraftList && <DraftList />}
          {isPublicationList ? <PublicationList /> : null}
          <Library service={libraryService} />
          <Topbar
            onLibraryToggle={() => libraryService.send('LIBRARY.TOGGLE')}
          />
        </ErrorBoundary>
      </Box>
    </>
  )
}
