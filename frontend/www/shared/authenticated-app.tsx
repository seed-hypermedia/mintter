import React from 'react'
import {Switch, useRouteMatch} from 'react-router-dom'
import {ErrorBoundary} from 'react-error-boundary'
import {css} from 'emotion'
import {FullPageErrorMessage} from 'components/errorMessage'
import {PrivateRoute} from 'components/routes'
import Topbar from 'components/topbar'
import Layout from 'components/layout'
import Container from 'components/container'
import {useTheme} from './themeContext'

const Library = React.lazy(() => import('screens/library'))
const Settings = React.lazy(() => import('screens/settings'))
const Editor = React.lazy(() => import('screens/editor'))
const Publication = React.lazy(() => import('screens/publication'))

export default function AuthenticatedApp(props) {
  const match = useRouteMatch('/')

  return (
    <ErrorBoundary FallbackComponent={FullPageErrorMessage}>
      <AppLayout>
        <Topbar />
        <Switch>
          <PrivateRoute exact path="/editor/:version">
            <Editor />
          </PrivateRoute>
          <PrivateRoute exact path="/p/:version">
            <Publication />
          </PrivateRoute>
          <PrivateRoute>
            <Switch>
              <PrivateRoute path={`${match.url}library`}>
                <Library />
              </PrivateRoute>
              <PrivateRoute path={`${match.url}settings`}>
                <Settings />
              </PrivateRoute>
            </Switch>
          </PrivateRoute>
        </Switch>
      </AppLayout>
    </ErrorBoundary>
  )
}

function AppLayout({children}) {
  const {theme} = useTheme()
  return (
    <div
      className={`bg-background ${css`
        display: grid;
        width: 100vw;
        height: 100vh;
        grid-template-rows: auto 1fr;
        overflow: scroll;
      `} ${theme}`}
    >
      {children}
    </div>
  )
}
