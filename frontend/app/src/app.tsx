import {globalCss} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {useActor} from '@xstate/react'
import {lazy} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {attachConsole, error} from 'tauri-plugin-log-api'
import {useAuth} from './auth-context'
import {SidepanelProvider} from './components/sidepanel'
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
  const authService = useAuth()
  const [state] = useActor(authService)

  if (state.matches('checkingAccount')) {
    return <Text>Checking Account...</Text>
  }

  if (state.matches('loggedOut')) {
    return <OnboardingPage />
  }

  if (state.matches('loggedIn')) {
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
