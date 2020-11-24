import React from 'react'
import {isLocalhost} from './isLocalhost'

const PublisherNode = React.lazy(() => import('./publisher-node'))
const AuthorNode = React.lazy(() => import('./author-node'))

export function App() {
  console.log(
    '============== isLocalhost => ',
    isLocalhost(window.location.hostname),
  )
  return isLocalhost(window.location.hostname) ? (
    <AuthorNode path="/" />
  ) : (
    <PublisherNode />
  )
}
