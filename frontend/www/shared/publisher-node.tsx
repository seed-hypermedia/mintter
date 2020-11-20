import React from 'react'
import {Switch, Route, Redirect, useRouteMatch} from 'react-router-dom'
import {PrivateRoute} from 'components/routes'
import {AppLayout} from 'components/layout'

const PublicLibrary = React.lazy(() => import('../screens/public-library'))
const Publication = React.lazy(() => import('../screens/publication'))
const Topbar = React.lazy(() => import('../components/topbar'))
const AuthorNode = React.lazy(() => import('./author-node'))

export default function PublisherNode() {
  return (
    <Switch>
      <Route exact path="/">
        <PublicLibrary />
      </Route>
      <PrivateRoute exact path="/p/:slug" pathname="/no-profile">
        <AppLayout>
          <Topbar isPublic />
          <Publication />
        </AppLayout>
      </PrivateRoute>
      <PrivateRoute path="/admin">
        <AuthorNode />
      </PrivateRoute>
      <Route>
        <div>Setup your node first</div>
      </Route>
    </Switch>
  )
}
