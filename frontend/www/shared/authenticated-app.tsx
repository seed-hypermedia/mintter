import {Switch, useRouteMatch} from 'react-router-dom'
import {ErrorBoundary} from 'react-error-boundary'
import {FullPageErrorMessage} from 'components/errorMessage'
import {PrivateRoute} from 'components/private-route'
import Topbar from 'components/topbar'
import Layout from 'components/layout'
import Container from 'components/container'
import {Library} from 'screens/library'
import {Settings} from 'screens/settings'
import {Editor} from 'screens/editor'

export default function AuthenticatedApp(props) {
  const match = useRouteMatch('/')

  return (
    <ErrorBoundary FallbackComponent={FullPageErrorMessage}>
      <Switch>
        <PrivateRoute exact path="/editor/:documentId">
          <Editor />
        </PrivateRoute>
        <PrivateRoute>
          <Layout className="flex flex-col">
            <Topbar />
            <div className="flex-1 overflow-y-auto">
              <Container>
                <Switch>
                  <PrivateRoute path={`${match.path}library`}>
                    <Library />
                  </PrivateRoute>
                  <PrivateRoute path={`${match.path}settings`}>
                    <Settings />
                  </PrivateRoute>
                </Switch>
              </Container>
            </div>
          </Layout>
        </PrivateRoute>
      </Switch>
    </ErrorBoundary>
  )
}
