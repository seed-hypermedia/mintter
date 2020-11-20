import React from 'react'
import {FullPageSpinner} from 'components/fullPageSpinner'
import {isLocalhost} from './isLocalhost'

const PublisherNode = React.lazy(() => import('./publisher-node'))
const AuthorNode = React.lazy(() => import('./author-node'))

export function App() {
  return (
    <React.Suspense fallback={<FullPageSpinner />}>
      {isLocalhost(window.location.hostname) ? (
        <AuthorNode path="/" />
      ) : (
        <PublisherNode />
      )}
    </React.Suspense>
  )
}
