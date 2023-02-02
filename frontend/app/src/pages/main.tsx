import {useMainActor} from '@app/hooks/main-actor'
import {classnames} from '@app/utils/classnames'
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
var Footer = lazy(() => import('@components/footer'))

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
        {!isSettings ? (
          <>
            <QuickSwitcher />
            <Footer />
          </>
        ) : null}
      </div>
    </ErrorBoundary>
  )
}

function MainBoundary({error, resetErrorBoundary}: FallbackProps) {
  return (
    <div role="alert" data-layout-section="main">
      <p>Main Error</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>reload page</button>
    </div>
  )
}
