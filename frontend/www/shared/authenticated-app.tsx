import React from 'react'
import {Switch, useRouteMatch, Redirect} from 'react-router-dom'
import {ErrorBoundary} from 'react-error-boundary'
import {css} from 'emotion'
import {FullPageErrorMessage} from 'components/errorMessage'
import {PrivateRoute} from 'components/routes'
import {AppLayout} from 'components/layout'
import Topbar from 'components/topbar'
import Container from 'components/container'
import {useTheme} from './themeContext'

const Library = React.lazy(() => import('screens/library'))
const Settings = React.lazy(() => import('screens/settings'))
const Editor = React.lazy(() => import('screens/editor'))
const Publication = React.lazy(() => import('screens/publication'))

export default function AuthenticatedApp(props) {
  const match = useRouteMatch('/private')

  return (
    <ErrorBoundary FallbackComponent={FullPageErrorMessage}>
      <AppLayout>
        <Topbar />
        <Switch>
          <PrivateRoute exact path={match.url}>
            {console.log('redirect!!')}
            <Redirect to={`${match.url}/library`} />
          </PrivateRoute>
          <PrivateRoute exact path={`${match.url}/editor/:version`}>
            <Editor />
          </PrivateRoute>
          <PrivateRoute>
            <Switch>
              <PrivateRoute path={`${match.url}/library`}>
                {console.log('rendering Library!')}
                <Library />
              </PrivateRoute>
              <PrivateRoute path={`${match.url}/settings`}>
                <Settings />
              </PrivateRoute>
            </Switch>
          </PrivateRoute>
        </Switch>
      </AppLayout>
    </ErrorBoundary>
  )
}
