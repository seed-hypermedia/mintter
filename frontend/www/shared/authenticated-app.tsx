import {
  Switch,
  useLocation,
  Route,
  Redirect,
  useRouteMatch,
} from 'react-router-dom'
import {ErrorBoundary} from 'react-error-boundary'
import {FullPageErrorMessage} from 'components/errorMessage'
import Topbar from 'components/topbar'
import Layout from 'components/layout'
import Container from 'components/container'
import {Library} from 'screens/library'
import {Settings} from 'screens/settings'

export default function AuthenticatedApp(props) {
  const match = useRouteMatch('/')

  return (
    <ErrorBoundary FallbackComponent={FullPageErrorMessage}>
      <Layout className="flex flex-col">
        <Topbar />
        <div className="flex-1 overflow-y-auto">
          <Container>
            <Switch>
              <Route path={`${match.path}library`}>
                <Library />
              </Route>
              <Route path={`${match.path}settings`}>
                <Settings />
              </Route>
            </Switch>
          </Container>
        </div>
      </Layout>
    </ErrorBoundary>
  )
}
