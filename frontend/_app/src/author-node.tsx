import * as React from 'react';
import {
  Switch,
  Route,
  useRouteMatch,
  Redirect,
  match as Match,
} from 'react-router-dom';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { createPath, PrivateRoute } from './routes';

function AuthorNodeErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert">
      <p>Something went wrong in the Author Node:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

type AuthorNodeProps = {
  path?: string;
};

const Library = React.lazy(() => import('./library'));
const WelcomeWizard = React.lazy(() => import('./welcome-wizard'));

export default function AuthorNode({ path = '/' }: AuthorNodeProps) {
  const match = useRouteMatch(path) as Match;
  return (
    <ErrorBoundary
      FallbackComponent={AuthorNodeErrorFallback}
      onReset={() => {
        console.log('TODO: reload app');
      }}
    >
      <Switch>
        <Route path={createPath(match, 'welcome')}>
          <WelcomeWizard />
        </Route>
        <Route path="/">
          {/* TODO: add app layout */}
          <Switch>
            <PrivateRoute exact path={match.url}>
              <Redirect to={createPath(match, 'library')} />
            </PrivateRoute>
            <PrivateRoute path={createPath(match, 'library')}>
              <Library />
            </PrivateRoute>
          </Switch>
        </Route>
      </Switch>
    </ErrorBoundary>
  );
}
