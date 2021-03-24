import { lazily } from 'react-lazily';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

import { isLocalNode } from './constants';

const { AuthorNode } = lazily(() => import('./author-node'));
const { PublisherNode } = lazily(() => import('./publisher-node'));

export const App: React.FC = () => {
  return (
    <ErrorBoundary
      FallbackComponent={AppError}
      onReset={() => {
        console.log('TODO: reload app');
      }}
    >
      {isLocalNode ? <AuthorNode path="/" /> : <PublisherNode />}
    </ErrorBoundary>
  );
};

const AppError: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div role="alert">
      <p>Something went wrong loading the App:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
};
