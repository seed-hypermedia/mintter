import React from 'react'
import { lazily } from 'react-lazily';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

import { global } from '@mintter/ui/stitches.config';
const { AuthorNode } = lazily(() => import('./author-node'));
const { PublisherNode } = lazily(() => import('./publisher-node'));

const globalStyles = global({
  body: {
    backgroundColor: '$background-alt',
    color: '$text-default',
  },
});
export const App: React.FC = () => {
  globalStyles();
  return (
    <ErrorBoundary
      FallbackComponent={AppError}
      onReset={() => {
        console.log('TODO: reload app');
      }}
    >
      {/* {isLocalNode ? <AuthorNode path="/" /> : <PublisherNode />} */}
      <AuthorNode path="/" />
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
