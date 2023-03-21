import {useMainActor} from '@app/hooks/main-actor'
import {classnames} from '@app/utils/classnames'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Heading} from '@components/heading'
import {TitleBar} from '@components/titlebar'
import {lazy} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {Redirect} from 'wouter'
import {Route, useRoute} from '../components/router'
import '../styles/main.scss'
import './polyfills'

var PublicationList = lazy(() => import('@app/pages/publication-list-page'))
var Site = lazy(() => import('@app/pages/site-page'))
var DraftList = lazy(() => import('@app/pages/draft-list-page'))
var Publication = lazy(() => import('@app/pages/publication'))
var Draft = lazy(() => import('@app/pages/draft'))
var Settings = lazy(() => import('@app/pages/settings'))
var QuickSwitcher = lazy(() => import('@components/quick-switcher'))

export default function Main() {
  const [isSettings] = useRoute('/settings')
  const mainActor = useMainActor()

  return (
    <ErrorBoundary
      FallbackComponent={MainBoundary}
      onReset={() => {
        window.location.reload()
      }}
    >
      <div className={classnames('main-root', {settings: isSettings})}>
        <main>
          <Route path="/inbox">
            <PublicationList />
          </Route>
          <Route path="/drafts">
            <DraftList />
          </Route>
          <Route path="/sites/:hostname">
            <Site />
          </Route>
          <Route path="/p/:id/:version/:block?">
            {mainActor?.type === 'publication' ? (
              <Publication
                key={window.location.href}
                publicationActor={mainActor.actor}
              />
            ) : null}
          </Route>
          <Route path="/d/:id/:tag?">
            {mainActor?.type === 'draft' ? (
              <Draft
                key={window.location.href}
                draftActor={mainActor.actor}
                editor={mainActor.editor}
              />
            ) : null}
          </Route>
          <Route path="/settings">
            <Settings />
          </Route>
          <Route>{() => <Redirect to="/inbox" />}</Route>
        </main>
        <TitleBar clean={isSettings} mainActor={mainActor} />
        {!isSettings ? <QuickSwitcher /> : null}
      </div>
    </ErrorBoundary>
  )
}

function MainBoundary({error, resetErrorBoundary}: FallbackProps) {
  return (
    <Box
      css={{
        background: '$base-background-normal',
        display: 'flex',
        minHeight: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Box
        css={{
          background: '$base-background-subtle',
          boxShadow: '$menu',
          padding: '$4',
          display: 'flex',
          flexDirection: 'column',
          minWidth: '50vw',
        }}
      >
        <Heading color="danger">App Error!</Heading>
        <pre>{error.message}</pre>
        <Button onClick={resetErrorBoundary} css={{alignSelf: 'flex-end'}}>
          Reload
        </Button>
      </Box>
    </Box>
  )
}
