import { lazy } from 'react';
import { Switch, Route, useRouteMatch, Redirect } from 'react-router-dom';
import { lazily } from 'react-lazily';
import { createPath, getPath } from '@utils/routes';
import { AppSpinner } from '@components/app-spinner';
import { Topbar } from '@components/topbar';
import { useProfile } from './mintter-hooks';
import { Box } from '@mintter/ui/box';

const { OnboardingPage } = lazily(() => import('@pages/onboarding'));
const Library = lazy(() => import('./pages/library'));
const Editor = lazy(() => import('./pages/editor'));
const Settings = lazy(() => import('./pages/settings'));

export const AuthorNode: React.FC<{ path?: string }> = ({ path = '/' }) => {
  const match = useRouteMatch(path)!;

  const profile = useProfile({
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  if (profile.isLoading) {
    return <AppSpinner isFullScreen />;
  }

  if (profile.isError || (profile.isSuccess && !profile.data)) {
    return (
      <Switch>
        <Route exact path={createPath(match, 'welcome')}>
          <OnboardingPage />
        </Route>
        <Route
          render={(route) => (
            <Redirect
              to={{
                pathname: `${getPath(route.match)}/welcome`,
                state: { from: route.location.pathname },
              }}
            />
          )}
        />
      </Switch>
    );
  }

  if (profile.isSuccess && profile.data) {
    return (
      <Box
        css={{
          minHeight: '100vh',
          display: 'grid',
          gridTemplateRows: '64px 1fr',
        }}
      >
        <Topbar />
        <Switch>
          <Route path={['/library', '/admin/library']}>
            <Library />
          </Route>
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
      </Box>
    );
  }

  throw new Error();
};
