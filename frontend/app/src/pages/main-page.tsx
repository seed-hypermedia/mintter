import {useMain} from '@app/main-context'
import {DraftRef, PublicationRef} from '@app/main-machine'
import {
  MainPageShell,
  MainWindowShell,
  PageError,
  rootPageStyle,
} from '@app/pages/window-components'
import {css} from '@app/stitches.config'
import {Box} from '@components/box'
import {Library, LibraryShell} from '@components/library'
import {Settings} from '@components/settings'
import {Topbar, TopbarShell} from '@components/topbar'
import {useActor} from '@xstate/react'
import {ErrorBoundary} from 'react-error-boundary'
import {DraftList} from './draft-list-page'
import EditorPage from './editor'
import Publication from './publication'
import {PublicationList} from './publication-list-page'

export default function MainPage() {
  const mainService = useMain()
  const [state] = useActor(mainService)

  if (state.matches('routes.settings')) {
    return <Settings />
  }
  if (state.hasTag('loading')) {
    return (
      <MainPageShell>
        <MainWindowShell />
        <LibraryShell />
        <TopbarShell />
      </MainPageShell>
    )
  }

  return (
    <Box className={rootPageStyle()}>
      <ErrorBoundary
        FallbackComponent={PageError}
        onReset={() => {
          window.location.reload()
        }}
      >
        {state.hasTag('library') ? <Library /> : null}
        {state.hasTag('topbar') ? <Topbar /> : null}
        {state.context.currentFile ? (
          state.hasTag('publication') ? (
            <Publication
              publicationRef={state.context.currentFile as PublicationRef}
              key={state.context.params.docId}
            />
          ) : state.hasTag('draft') ? (
            <EditorPage
              key={state.context.params.docId}
              draftRef={state.context.currentFile as DraftRef}
            />
          ) : null
        ) : null}
        {state.matches('routes.home') ? <PublicationList /> : null}
        {state.matches('routes.draftList') ? <DraftList /> : null}
        {state.matches('routes.publicationList') ? <PublicationList /> : null}
      </ErrorBoundary>
    </Box>
  )
}

var libraryShell = css({
  backgroundColor: '$base-background-normal',
  blockSize: 232,
  inlineSize: '$full',
})
