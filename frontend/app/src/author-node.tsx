import { lazy } from 'react';
import { Switch, Route, useRouteMatch, Redirect } from 'react-router-dom';
import { lazily } from 'react-lazily';

import { createPath, getPath } from '@utils/routes';
import { AppSpinner } from '@components/app-spinner';

import { AppLayout } from './layouts';
import { Topbar } from './topbar';
import { useProfile } from './mintter-hooks';

const { OnboardingPage } = lazily(() => import('@pages/onboarding'));
const Library = lazy(() => import('./library-page'));
const Editor = lazy(() => import('./editor-page'));
const Settings = lazy(() => import('./settings-page'));

export const AuthorNode: React.FC<{ path?: string }> = ({ path = '/' }) => {
  const match = useRouteMatch(path)!;

  const profile = useProfile({
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  if (profile.isLoading) {
    return <AppSpinner />;
  }

  if (profile.isError || (profile.isSuccess && !profile.data)) {
    return (
      <Switch>
        <Route exact path={createPath(match, 'onboarding')}>
          <OnboardingPage />
        </Route>
        <Route
          render={(route) => (
            <Redirect
              to={{
                pathname: `${getPath(route.match)}/onboarding`,
                state: { from: route.location },
              }}
            />
          )}
        />
      </Switch>
    );
  }

  if (profile.isSuccess && profile.data) {
    return (
      <AppLayout>
        <Topbar />
        <Switch>
          <Route path={['/library', '/admin/library']}>
            <Library />
          </Route>
          <Route exact path={match.url}></Route>
          <Route
            exact
            path={['/editor/:documentId', '/admin/editor/:documentId']}
          >
            <Editor />
          </Route>
          {/* <Route
               exact
               path={['/p/:slug', '/admin/p/:slug']}
               component={Publication}
             /> */}
          <Route path={['/settings', '/admin/settings']}>
            <Settings />
          </Route>
          <Route>
            <Redirect to={createPath(match, 'library')} />
          </Route>
        </Switch>
      </AppLayout>
    );
  }

  throw new Error();
};
