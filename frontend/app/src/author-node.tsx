import {useInfo} from '@mintter/client/hooks'
import {Box} from '@mintter/ui/box'
import {Text} from '@mintter/ui/text'
import {lazy} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import type {RouteComponentProps} from 'react-router-dom'
import {Redirect, Route, Switch} from 'react-router-dom'
import {AppError} from './app'
import {Topbar} from './components/topbar'

const OnboardingPage = lazy(() => import('./pages/onboarding'))
const Library = lazy(() => import('./pages/library'))
const Editor = lazy(() => import('./pages/editor'))
const Settings = lazy(() => import('./pages/settings'))
const Publication = lazy(() => import('./pages/publication'))

export function AuthorNode({path = '/'}: {path?: string}) {
  const info = useInfo({
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
  })

  if (info.isLoading) {
    return <Text>loading...</Text>
  }

  if (info.isError || (info.isSuccess && !info.data)) {
    return (
      <Switch>
        <Route exact path={'/welcome'}>
          <OnboardingPage />
        </Route>
        <Route
          render={(route: RouteComponentProps) => (
            <Redirect
              to={{
                pathname: `/welcome`,
                state: {from: route.location.pathname},
              }}
            />
          )}
        />
      </Switch>
    )
  }

  if (info.isSuccess && info.data) {
    return (
      <ErrorBoundary FallbackComponent={AppError}>
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
            <Route exact path={['/editor/:docId', '/admin/editor/:docId']}>
              <Editor />
            </Route>
            <Route path={['/p/:docId', '/admin/p/:docId']}>
              <Publication />
            </Route>
            <Route path={['/settings', '/admin/settings']}>
              <Settings />
            </Route>
            <Route>
              <Redirect to={'/library'} />
            </Route>
          </Switch>
        </Box>
      </ErrorBoundary>
    )
  }

  return null
}
