import * as React from 'react';
import { isLocalNode } from './constants';

const PublisherNode = React.lazy(() => import('./publisher-node'));
const AuthorNode = React.lazy(() => import('./author-node'));

export function App() {
  // Create the count state.
  return isLocalNode ? <AuthorNode path="/" /> : <PublisherNode />;
}
