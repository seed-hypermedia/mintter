import React from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';
import { WelcomeProvider } from './welcome-provider';
import WelcomeIntro from './intro-page';
import { ProgressRoute, createPath } from './routes';
import { Box } from '@mintter/ui/box';

const SecurityPack = React.lazy(() => import('./security-pack-page'));
// const RetypeSeed = React.lazy(() => import('screens/welcome/retype-seed'));
const EditProfile = React.lazy(() => import('./edit-profile-page'));
const Complete = React.lazy(() => import('./complete-page'));

export default function UnAuthenticatedApp() {
  const match = useRouteMatch();

  return (
    <Box css={{ width: '100vw', height: '100vh' }}>
      <WelcomeProvider>
        <Switch>
          {/* the first route does not use the ProgressRoute component since this is how I avoid the infinite redirect loop (I'm redirecting from the ProgressRoute to this route) */}
          <Route exact path={match.url}>
            <WelcomeIntro />
          </Route>
          <Route path={createPath(match, 'security-pack')}>
            <SecurityPack />
          </Route>

          {/* <ProgressRoute path={createPath(match, 'retype-seed')}>
            <RetypeSeed />
          </ProgressRoute> */}

          <ProgressRoute path={createPath(match, 'edit-profile')}>
            <EditProfile />
          </ProgressRoute>
          <ProgressRoute path={createPath(match, 'complete')}>
            <Complete />
          </ProgressRoute>
        </Switch>
      </WelcomeProvider>
    </Box>
  );
}
