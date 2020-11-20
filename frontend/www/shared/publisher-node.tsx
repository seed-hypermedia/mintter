import React from 'react'
import {Switch, Route} from 'react-router-dom'
import {PrivateRoute} from 'components/routes'
import {AppLayout} from 'components/layout'

const PublicLibrary = React.lazy(() => import('../screens/public-library'))
const Publication = React.lazy(() => import('../screens/publication'))
const Topbar = React.lazy(() => import('../components/topbar'))
const AuthorNode = React.lazy(() => import('./author-node'))

export default function PublisherNode() {
  return (
    <Switch>
      <PrivateRoute exact path="/" pathname="/no-profile">
        <PublicLibrary />
      </PrivateRoute>
      <PrivateRoute exact path="/p/:slug" pathname="/no-profile">
        <AppLayout>
          <Topbar isPublic />
          <Publication />
        </AppLayout>
      </PrivateRoute>
      <PrivateRoute path="/admin">
        <AuthorNode path="/admin" />
      </PrivateRoute>
      <Route>
        <div className="p-4 mx-auto max-w-sm w-full text-center font-bold text-gray-500">
          Setup your node first
        </div>
      </Route>
    </Switch>
  )
}
