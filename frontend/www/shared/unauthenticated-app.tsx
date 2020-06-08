import React from 'react'
import {Switch, Route, useRouteMatch} from 'react-router-dom'
import Layout, {LayoutProps} from 'components/layout'
import WelcomeProvider from 'shared/welcomeProvider'
import ThemeToggle from 'components/themeToggle'
import WelcomeIntro from 'screens/welcome/intro'
import {PublicRoute} from 'components/routes'

const SecurityPack = React.lazy(() => import('screens/welcome/security-pack'))
const RetypeSeed = React.lazy(() => import('screens/welcome/retype-seed'))
const CreatePassword = React.lazy(() =>
  import('screens/welcome/create-password'),
)
const EditProfile = React.lazy(() => import('screens/welcome/edit-profile'))
const Complete = React.lazy(() => import('screens/welcome/complete'))

export default function WelcomeLayout({
  children,
  className = '',
  ...props
}: LayoutProps) {
  const match = useRouteMatch('/welcome')
  return (
    <Layout
      {...props}
      className={`bg-background flex flex-col py-8 ${className}`}
    >
      <div className="absolute right-0 top-0 p-4">
        <ThemeToggle />
      </div>
      <WelcomeProvider>
        <Switch>
          <PublicRoute exact path={`${match.url}`}>
            <WelcomeIntro />
          </PublicRoute>
          <PublicRoute path={`${match.url}/security-pack`}>
            <SecurityPack />
          </PublicRoute>
          <PublicRoute path={`${match.url}/retype-seed`}>
            <RetypeSeed />
          </PublicRoute>
          <PublicRoute path={`${match.url}/create-password`}>
            <CreatePassword />
          </PublicRoute>
          <PublicRoute path={`${match.url}/edit-profile`}>
            <EditProfile />
          </PublicRoute>
          <PublicRoute path={`${match.url}/complete`}>
            <Complete />
          </PublicRoute>
        </Switch>
      </WelcomeProvider>
    </Layout>
  )
}
