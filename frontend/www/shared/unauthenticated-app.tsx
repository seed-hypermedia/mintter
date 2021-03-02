import React from 'react'
import {Switch, Route, useRouteMatch, Redirect} from 'react-router-dom'
import Layout, {LayoutProps} from 'components/layout'
import WelcomeProvider from 'shared/welcome-provider'
import ThemeToggle from 'components/theme-toggle'
import WelcomeIntro from 'screens/welcome/intro'
import {ProgressRoute, createPath} from 'components/routes'
import {Box} from 'components/box'

const SecurityPack = React.lazy(() => import('screens/welcome/security-pack'))
const RetypeSeed = React.lazy(() => import('screens/welcome/retype-seed'))
const EditProfile = React.lazy(() => import('screens/welcome/edit-profile'))
const Complete = React.lazy(() => import('screens/welcome/complete'))

export default function UnAuthenticatedApp() {
  const match = useRouteMatch()

  return (
    <Box css={{width: '100vw', height: '100vh'}}>
      <WelcomeProvider>
        <Switch>
          {/* the first route does not use the ProgressRoute component since this is how I avoid the infinite redirect loop (I'm redirecting from the ProgressRoute to this route) */}
          <Route exact path={match.url}>
            <WelcomeIntro />
          </Route>
          <ProgressRoute path={createPath(match, 'security-pack')}>
            <SecurityPack />
          </ProgressRoute>
          <ProgressRoute path={createPath(match, 'retype-seed')}>
            <RetypeSeed />
          </ProgressRoute>
          <ProgressRoute path={createPath(match, 'edit-profile')}>
            <EditProfile />
          </ProgressRoute>
          <ProgressRoute path={createPath(match, 'complete')}>
            <Complete />
          </ProgressRoute>
        </Switch>
      </WelcomeProvider>
    </Box>
  )
}
