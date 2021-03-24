import { lazily } from 'react-lazily';
import { isLocalNode } from './constants';
const { AuthorNode } = lazily(() => import('./author-node'));
const { PublisherNode } = lazily(() => import('./publisher-node'));

export const App: React.FC = () => {
  // Create the count state.
  return isLocalNode ? <AuthorNode path="/" /> : <PublisherNode />;
};
