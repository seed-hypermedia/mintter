import { lazy } from 'react';
import { Switch, Route, useRouteMatch, Redirect } from 'react-router-dom';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

import { createPath, PrivateRoute } from './routes';
import { AppLayout } from './layouts';
import { Topbar } from './topbar';

const WelcomeWizard = lazy(() => import('./welcome-wizard'));
const Editor = lazy(() => import('./editor-page'));
const Library = lazy(() => import('./library-page'));
const Settings = lazy(() => import('./settings-page'));

export const AuthorNode: React.FC<{ path?: string }> = ({ path = '/' }) => {
  const match = useRouteMatch(path)!;

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
};

const AuthorNodeErrorFallback: React.FC<FallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  return (
    <div role="alert">
      <p>Something went wrong in the Author Node:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
};
