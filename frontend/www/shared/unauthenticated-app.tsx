import React from 'react'
import {Switch, Route, useRouteMatch} from 'react-router-dom'
import Layout, {LayoutProps} from 'components/layout'
import WelcomeProvider from 'shared/welcomeProvider'
import ThemeToggle from 'components/themeToggle'
import WelcomeIntro from 'screens/welcome/intro'
import {ProgressRoute} from 'components/routes'

const SecurityPack = React.lazy(() => import('screens/welcome/security-pack'))
const RetypeSeed = React.lazy(() => import('screens/welcome/retype-seed'))
const EditProfile = React.lazy(() => import('screens/welcome/edit-profile'))
const Complete = React.lazy(() => import('screens/welcome/complete'))

export default function Welcome({className = '', ...props}: LayoutProps) {
  const match = useRouteMatch('/private/welcome')
  return (
    <Layout {...props} className={`bg-red-300 flex flex-col py-8 ${className}`}>
      <div className="absolute right-0 top-0 p-4">
        <ThemeToggle />
      </div>
      <WelcomeProvider>
        <Switch>
          {/* the first route does not use the ProgressRoute component since this is how I avoid the infinite redirect loop (I'm redirecting from the ProgressRoute to this route) */}
          <Route exact path={match.url}>
            <WelcomeIntro />
          </Route>
          <ProgressRoute path={`${match.url}/security-pack`}>
            <SecurityPack />
          </ProgressRoute>
          <ProgressRoute path={`${match.url}/retype-seed`}>
            <RetypeSeed />
          </ProgressRoute>
          <ProgressRoute path={`${match.url}/edit-profile`}>
            <EditProfile />
          </ProgressRoute>
          <ProgressRoute path={`${match.url}/complete`}>
            <Complete />
          </ProgressRoute>
        </Switch>
      </WelcomeProvider>
    </Layout>
  )
}
