import {lazy} from 'react'
import {Switch, Route, useRouteMatch, Redirect} from 'react-router-dom'
import {lazily} from 'react-lazily'
import {createPath, getPath} from './utils/routes'
import {AppSpinner} from './components/app-spinner'
import {Topbar} from './components/topbar'
import {useInfo} from '@mintter/client/hooks'
import {Box} from '@mintter/ui'

const {OnboardingPage} = lazily(() => import('./pages/onboarding'))
const Library = lazy(() => import('./pages/library'))
const Editor = lazy(() => import('./pages/editor'))
const {Settings} = lazily(() => import('./pages/settings'))
const Publication = lazy(() => import('./pages/publication'))

export function AuthorNode({path = '/'}: {path?: string}) {
  const match = useRouteMatch(path)!

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
        <Route exact path={createPath(match, 'welcome')}>
          <OnboardingPage />
        </Route>
        <Route
          render={route => (
            <Redirect
              to={{
                pathname: `${getPath(route.match)}/welcome`,
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
          <Route
            path={['/p/:docId/:docVersion', '/admin/p/:docId/:docVersion']}
          >
            <Publication />
          </Route>
          <Route path={['/settings', '/admin/settings']}>
            <Settings />
          </Route>
          <Route>
            <Redirect to={createPath(match, 'library')} />
          </Route>
        </Switch>
      </Box>
    )
  }

  return null
}
