import React from 'react'
import {Switch, Route, Redirect} from 'react-router-dom'
import {FullPageSpinner} from 'components/fullPageSpinner'
import {PrivateRoute} from 'components/routes'
import {NoRoute} from 'screens/no-route'

const AuthenticatedApp = React.lazy(() =>
  import(/* webpackPrefetch: true */ './authenticated-app'),
)

const UnAuthenticatedApp = React.lazy(() => import('./unauthenticated-app'))

export function App() {
  return (
    <React.Suspense fallback={<FullPageSpinner />}>
      <Switch>
        <Route exact path="/">
          <Redirect to="/library" />
        </Route>
        <Route path="/welcome">
          <UnAuthenticatedApp />
        </Route>
        <PrivateRoute path="/">
          <AuthenticatedApp />
        </PrivateRoute>
        <Route path="*">
          <NoRoute />
        </Route>
      </Switch>
    </React.Suspense>
  )
}
