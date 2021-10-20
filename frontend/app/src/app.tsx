import {Box} from '@mintter/ui/box'
import {globalCss} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {lazy} from 'react'
import type {FallbackProps} from 'react-error-boundary'
import {ErrorBoundary} from 'react-error-boundary'
import {attachConsole, error} from 'tauri-plugin-log-api'
import {Redirect, Route, Switch} from 'wouter'
import {SidepanelProvider} from './components/sidepanel'
import {useInfo} from './hooks'
import {MainPage} from './pages/main-page'

const OnboardingPage = lazy(() => import('./pages/onboarding'))

if (!import.meta.env.SSR) {
  attachConsole()

  window.addEventListener('error', (e) => error(e.message))
}

const globalStyles = globalCss({
  body: {
    backgroundColor: '$background-alt',
    color: '$text-default',
  },
})

export function App() {
  globalStyles()

  const {status, data} = useInfo({
    useErrorBoundary: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
  })

  console.log(status, data)

  if (status == 'loading') {
    return <Text>loading...</Text>
  }

  if (status == 'error') {
    return (
      <Switch>
        <Route path="/welcome/:from?">
          <OnboardingPage />
        </Route>
        <Route>
          <Box>
            hello redirect
            <Redirect to={`/welcome`} />
          </Box>
        </Route>
      </Switch>
    )
  }

  return (
    <ErrorBoundary
      FallbackComponent={AppError}
      onReset={() => {
        location.reload()
      }}
    >
      <SidepanelProvider>
        <MainPage />
      </SidepanelProvider>
    </ErrorBoundary>
  )
}

export function AppError({error, resetErrorBoundary}: FallbackProps) {
  return (
    <div role="alert">
      <p>Something went wrong loading the App:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}
