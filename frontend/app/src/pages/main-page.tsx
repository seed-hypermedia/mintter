import {mainService as defaultMainService} from '@app/app-providers'
import {DraftRef, PublicationRef} from '@app/main-machine'
import {css} from '@app/stitches.config'
import {Box} from '@components/box'
import {Library} from '@components/library'
import {ScrollArea} from '@components/scroll-area'
import {Settings} from '@components/settings'
import {Text} from '@components/text'
import {Topbar} from '@components/topbar'
import {useActor} from '@xstate/react'
import {PropsWithChildren} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {DraftList} from './draft-list-page'
import EditorPage from './editor'
import Publication from './publication'
import {PublicationList} from './publication-list-page'

type MainPageProps = {
  mainService?: typeof defaultMainService
}

export function MainPage({mainService = defaultMainService}: MainPageProps) {
  const [state] = useActor(mainService)

  if (state.matches('routes.settings')) {
    return <Settings />
  }

  return (
    <Box className={rootPageStyle()}>
      {state.hasTag('topbar') ? (
        <Topbar currentFile={state.context.currentFile} />
      ) : null}
      {state.hasTag('library') ? <Library /> : null}
      <MainWindow>
        <ErrorBoundary
          FallbackComponent={PageError}
          onReset={() => {
            window.location.reload()
          }}
        >
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
          {state.matches('routes.home') ? (
            <PublicationList mainService={mainService} />
          ) : null}
          {state.matches('routes.draftList') ? (
            <DraftList mainService={mainService} />
          ) : null}
          {state.matches('routes.publicationList') ? (
            <PublicationList mainService={mainService} />
          ) : null}
        </ErrorBoundary>
        {/* <Box
          css={{
            position: 'absolute',
            zIndex: '$max',
            maxWidth: 300,

            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'white',
            top: 100,
            left: 20,
            padding: 20,
            bottom: 100,
            overflow: 'auto',
          }}
        >
          <pre>{JSON.stringify(state.value, null, 2)}</pre>
          <pre>{JSON.stringify(state, null, 2)}</pre>
        </Box> */}
      </MainWindow>
    </Box>
  )
}

export var rootPageStyle = css({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100vw',
  height: '100vh',
  display: 'grid',
  overflow: 'hidden',
  gridAutoFlow: 'column',
  gridAutoColumns: '1fr',
  gridTemplateRows: '40px 1fr',
  gridTemplateColumns: '1fr auto',
  gap: 0,
  gridTemplateAreas: `"topbar topbar"
  "main library"`,
  background: '$base-background-normal',
})

let mainWindowStyle = css({
  gridArea: 'main',
  height: '$full',
  overflow: 'hidden',
  position: 'relative',
  backgroundColor: '$base-background-subtle',
  paddingBottom: 0,
})

function MainWindow({children}: PropsWithChildren<any>) {
  return (
    <Box className={mainWindowStyle()}>
      <ScrollArea>{children}</ScrollArea>
    </Box>
  )
}

export function MainWindowShell({children, ...props}: PropsWithChildren<any>) {
  return (
    <Box {...props} className={mainWindowStyle()}>
      {children}
    </Box>
  )
}
export function MainPageShell(props: PropsWithChildren<any>) {
  return <Box {...props} className={rootPageStyle()} />
}

function Placeholder() {
  return (
    <Box
      aria-hidden
      css={{
        width: '$full',
        height: '$full',
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <Text
        alt
        fontWeight="bold"
        css={{
          // userSelect: 'none',
          WebkitUserSelect: 'none',
          fontSize: 100,
          opacity: 0.5,
          color: 'transparent',
          textShadow: '2px 2px 3px rgba(255,255,255,0.5)',
          backgroundClip: 'text',
          backgroundColor: '$base-component-bg-active',
        }}
      >
        Mintter
      </Text>
    </Box>
  )
}

function PageError({error, resetErrorBoundary}: FallbackProps) {
  return (
    <div role="alert">
      <p>Publication Error</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>reload page</button>
    </div>
  )
}
