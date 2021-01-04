import React from 'react'
import {Switch, Route, Redirect, useRouteMatch} from 'react-router-dom'
import {ErrorBoundary} from 'react-error-boundary'
import {FullPageErrorMessage} from 'components/error-message'
import {NoRoute} from 'screens/no-route'
import {PrivateRoute, createPath} from '../components/routes'
import {AppLayout} from 'components/layout'
import Topbar from 'components/topbar'

const Library = React.lazy(() => import('screens/library'))
const Settings = React.lazy(() => import('screens/settings'))
const Editor = React.lazy(() => import('screens/editor'))
const Publication = React.lazy(() => import('screens/publication'))
const WelcomeWizard = React.lazy(() => import('./unauthenticated-app'))

export default function AuthorNode({path = '/'}) {
  const match = useRouteMatch(path)
  return (
    <ErrorBoundary FallbackComponent={FullPageErrorMessage}>
      <Switch>
        <Route path={createPath(match, 'welcome')}>
          <WelcomeWizard />
        </Route>
        <Route>
          <AppLayout>
            <Topbar />
            <Switch>
              <PrivateRoute exact path={match.url}>
                <Redirect to={createPath(match, 'library')} />
              </PrivateRoute>
              <PrivateRoute exact path={createPath(match, 'editor/:version')}>
                <Editor />
              </PrivateRoute>
              <PrivateRoute path={createPath(match, 'library')}>
                <Library />
              </PrivateRoute>
              <PrivateRoute exact path={createPath(match, 'p/:slug')}>
                <Publication />
              </PrivateRoute>
              <PrivateRoute path={createPath(match, 'settings')}>
                <Settings />
              </PrivateRoute>
              <Route>
                <NoRoute />
              </Route>
            </Switch>
          </AppLayout>
        </Route>
      </Switch>
    </ErrorBoundary>
  )
}
