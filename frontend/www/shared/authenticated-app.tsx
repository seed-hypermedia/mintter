import React from 'react'
import {Switch, useRouteMatch} from 'react-router-dom'
import {ErrorBoundary} from 'react-error-boundary'
import {FullPageErrorMessage} from 'components/errorMessage'
import {PrivateRoute} from 'components/routes'
import Topbar from 'components/topbar'
import Layout from 'components/layout'
import Container from 'components/container'

const Library = React.lazy(() => import('screens/library'))
const Settings = React.lazy(() => import('screens/settings'))
const Editor = React.lazy(() => import('screens/editor'))
const Publication = React.lazy(() => import('screens/publication'))

export default function AuthenticatedApp(props) {
  const match = useRouteMatch('/')

  return (
    <ErrorBoundary FallbackComponent={FullPageErrorMessage}>
      <Layout className="flex flex-col">
        <Topbar />
        <div className="flex-1 overflow-y-auto">
          {/* <Container> */}
          <Switch>
            <PrivateRoute exact path="/editor/:documentId">
              <Editor />
            </PrivateRoute>
            <PrivateRoute exact path="/p/:id">
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
          {/* </Container> */}
        </div>
      </Layout>
    </ErrorBoundary>
  )
}
