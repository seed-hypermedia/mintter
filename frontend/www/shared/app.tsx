import React from 'react'
import {Switch, Route, Redirect, useRouteMatch} from 'react-router-dom'
import {FullPageSpinner} from 'components/fullPageSpinner'
import {AppLayout} from 'components/layout'
import Topbar from 'components/topbar'
import {PrivateRoute} from 'components/routes'
import {NoRoute} from 'screens/no-route'

const AuthenticatedApp = React.lazy(
  () => import(/* webpackPrefetch: true */ './authenticated-app'),
)
const UnAuthenticatedApp = React.lazy(() => import('./unauthenticated-app'))
const PublicLibrary = React.lazy(() => import('../screens/public-library'))
const Publication = React.lazy(() => import('../screens/publication'))
const PublisherNode = React.lazy(() => import('./publisher-node'))
const AuthorNode = React.lazy(() => import('./author-node'))

export function App() {
  return (
    <React.Suspense fallback={<FullPageSpinner />}>
      <Switch>
        <Route exact path="/">
          <PublicLibrary />
        </Route>
        <Route path="/private">
          <PrivateRoutes />
        </Route>
        <PrivateRoute exact path="/p/:slug">
          <AppLayout>
            <Topbar isPublic />
            <Publication />
          </AppLayout>
        </PrivateRoute>
      </Switch>
    </React.Suspense>
  )
}

function PrivateRoutes() {
  const match = useRouteMatch('/private')
  return (
    <Switch>
      <Route exact path={match.url}>
        <Redirect to={`${match.url}/library/feed`} />
      </Route>
      <Route path={`${match.url}/welcome`}>
        <UnAuthenticatedApp />
      </Route>
      <PrivateRoute path={match.url}>
        <AuthenticatedApp />
      </PrivateRoute>
      <Route path="*">
        <NoRoute />
      </Route>
    </Switch>
  )
}
