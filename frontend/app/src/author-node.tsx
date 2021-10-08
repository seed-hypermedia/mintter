import {useInfo} from '@mintter/client/hooks'
import {Box} from '@mintter/ui/box'
import {Text} from '@mintter/ui/text'
import {lazy} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Redirect, Route, Switch} from 'wouter'
import {AppError} from './app'
import {Topbar} from './components/topbar'

const OnboardingPage = lazy(() => import('./pages/onboarding'))
const Library = lazy(() => import('./pages/library'))
const Editor = lazy(() => import('./pages/editor'))
const Settings = lazy(() => import('./pages/settings'))
const Publication = lazy(() => import('./pages/publication'))

export function AuthorNode() {
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
        <Route path="/welcome/:from?">
          <OnboardingPage />
        </Route>
        <Route>
          <Redirect to={`/welcome/${location.pathname}`} />
        </Route>
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
            <Route path="/library/:tab?">
              <Library />
            </Route>
            <Route path="/editor/:docId">
              <Editor />
            </Route>
            <Route path="/p/:docId">
              <Publication />
            </Route>
            <Route path="/settings">
              <Settings />
            </Route>
            <Route>
              <Redirect to="/library" />
            </Route>
          </Switch>
        </Box>
      </ErrorBoundary>
    )
  }

  console.log('author node info: ', info)

  return <Text>author node impossible state?</Text>
}
