import {lazy} from 'react'
import {Switch, Route, useRouteMatch, Redirect} from 'react-router-dom'
import type {RouteComponentProps} from 'react-router-dom'
import {lazily} from 'react-lazily'
import {AppSpinner} from './components/app-spinner'
import {Topbar} from './components/topbar'
import {useInfo} from '@mintter/client/hooks'
import {Box} from '@mintter/ui'
import {ErrorBoundary} from 'react-error-boundary'
import {AppError} from './app'

const {OnboardingPage} = lazily(() => import('./pages/onboarding'))
const Library = lazy(() => import('./pages/library'))
const Editor = lazy(() => import('./pages/editor'))
const {Settings} = lazily(() => import('./pages/settings'))
const Publication = lazy(() => import('./pages/publication'))

export function AuthorNode({path = '/'}: {path?: string}) {
  const info = useInfo({
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
  })

  if (info.isLoading) {
    return <AppSpinner isFullScreen />
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
