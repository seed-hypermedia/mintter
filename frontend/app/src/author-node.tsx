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
import { AppLayout } from './layouts';
import { Topbar } from './topbar';

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

const Library = React.lazy(() => import('./library-page'));
const WelcomeWizard = React.lazy(() => import('./welcome-wizard'));
const Settings = React.lazy(() => import('./settings-page'));
const Editor = React.lazy(() => import('./editor-page'));

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
        <Route>
          <AppLayout>
            <Topbar />
            <Switch>
              <PrivateRoute exact path={match.url}>
                <Redirect to={createPath(match, 'library')} />
              </PrivateRoute>
              <PrivateRoute
                exact
                path={['/editor/:documentId', '/admin/editor/:documentId']}
              >
                <Editor />
              </PrivateRoute>
              <PrivateRoute path={['/library', '/admin/library']}>
                <Library />
              </PrivateRoute>
              {/* <PrivateRoute
                exact
                path={['/p/:slug', '/admin/p/:slug']}
                component={Publication}
              /> */}
              <PrivateRoute path={['/settings', '/admin/settings']}>
                <Settings />
              </PrivateRoute>
              <Route>
                <p>No route match :(</p>
              </Route>
            </Switch>
          </AppLayout>
        </Route>
      </Switch>
    </ErrorBoundary>
  );
}
