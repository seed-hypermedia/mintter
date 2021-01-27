import React from 'react'
import {Switch, useRouteMatch, Redirect} from 'react-router-dom'
import {ErrorBoundary} from 'react-error-boundary'
import {FullPageErrorMessage} from 'components/error-message'
import {PrivateRoute} from 'components/routes'
import {AppLayout} from 'components/layout'
import Topbar from 'components/topbar'
import Seo from 'components/seo'

const Library = React.lazy(() => import('screens/library'))
const Settings = React.lazy(() => import('screens/settings'))
const Editor = React.lazy(() => import('screens/editor'))

export default function AuthenticatedApp() {
  const match = useRouteMatch()

  return (
    <ErrorBoundary FallbackComponent={FullPageErrorMessage}>
      <Seo>
        <meta name="robots" content="noindex, nofollow" />
      </Seo>
      <AppLayout>
        <Topbar />
        <Switch>
          <PrivateRoute exact path={match.url}>
            <Redirect to={`${match.url}/library`} />
          </PrivateRoute>
          <PrivateRoute exact path={`${match.url}/editor/:version`}>
            <Editor />
          </PrivateRoute>
          <PrivateRoute path={`${match.url}/library`}>
            <Library />
          </PrivateRoute>
          <PrivateRoute path={`${match.url}/settings`}>
            <Settings />
          </PrivateRoute>
        </Switch>
      </AppLayout>
    </ErrorBoundary>
  )
}
