import React from 'react'
import {Switch, Route} from 'react-router-dom'
import {PrivateRoute} from 'components/routes'
import {AppLayout} from 'components/layout'
import {NoRoute} from 'screens/no-route'

const PublicLibrary = React.lazy(() => import('../screens/public-library'))
const Publication = React.lazy(() => import('../screens/publication'))
const Topbar = React.lazy(() => import('../components/topbar'))
const AuthorNode = React.lazy(() => import('./author-node'))

export default function PublisherNode() {
  return (
    <Switch>
      <PrivateRoute exact path="/" pathname="/admin/welcome">
        <PublicLibrary />
      </PrivateRoute>
      <PrivateRoute exact path="/p/:slug">
        <AppLayout>
          <Topbar isPublic />
          <Publication />
        </AppLayout>
      </PrivateRoute>
      <Route path="/admin">
        <AuthorNode path="/admin" />
      </Route>
      <Route>
        <NoRoute />
      </Route>
    </Switch>
  )
}
