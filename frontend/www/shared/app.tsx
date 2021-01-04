import React from 'react'
import {isLocalhost} from './is-localhost'

const PublisherNode = React.lazy(() => import('./publisher-node'))
const AuthorNode = React.lazy(() => import('./author-node'))

export function App() {
  return isLocalhost(window.location.hostname) ? (
    <AuthorNode path="/" />
  ) : (
    <PublisherNode />
  )
}
