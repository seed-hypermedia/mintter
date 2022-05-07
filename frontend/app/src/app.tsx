import {useAuth} from '@app/auth-context'
import {startLogger} from '@app/utils/logger'
import {LibraryShell} from '@components/library'
import {TopbarStyled} from '@components/topbar'
import {useActor} from '@xstate/react'
import {lazy} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {setLogger} from 'react-query'
import {MainPage, MainPageShell, MainWindowShell} from './pages/main-page'
import {globalCss} from './stitches.config'

setLogger({
  log: console.log,
  warn: console.warn,
  // ✅ no more errors on the console
  error: () => {
    // noop
  },
})

const OnboardingPage = lazy(() => import('./pages/onboarding'))

startLogger()

const globalStyles = globalCss({
  body: {
    backgroundColor: '$base-background-subtle',
    color: '$base-text-hight',
  },
})

export function App() {
  globalStyles()
  const service = useAuth()
  const [state] = useActor(service)

  // return <AppShell />

  if (state.matches('checkingAccount')) {
    return <AppShell />
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
        <MainPage />
      </ErrorBoundary>
    )
  }

  console.error('ERROR: no state match on MainPage')

  return null
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

function AppShell() {
  return (
    <MainPageShell>
      <TopbarStyled />
      <LibraryShell />
      <MainWindowShell />
    </MainPageShell>
  )
}
