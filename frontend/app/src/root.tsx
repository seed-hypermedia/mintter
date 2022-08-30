import {AuthProvider, useAuthService} from '@app/auth-context'
import {createAuthService} from '@app/auth-machine'
import {createThemeService, ThemeProvider} from '@app/theme'
import {error} from '@app/utils/logger'
import {LibraryShell} from '@components/library'
import {QuickSwitcher} from '@components/quick-switcher'

import {useActor, useInterpret} from '@xstate/react'
import React, {lazy, Suspense} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {
  dehydrate,
  Hydrate,
  QueryClient,
  QueryClientProvider,
  setLogger,
} from 'react-query'
import 'show-keys'
import {info, warn} from 'tauri-plugin-log-api'
import {MainPageShell, MainWindowShell} from './pages/window-components'
import {globalStyles} from './stitches.config'

const OnboardingPage = lazy(() => import('./pages/onboarding'))
const AppProvider = lazy(() => import('./app-provider'))
const MainPage = lazy(() => import('./pages/main-page'))
// app component lazy

export function Root() {
  globalStyles()
  const service = useAuthService()
  const [state] = useActor(service)

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
        <AppProvider>
          <MainPage />
          <QuickSwitcher />
        </AppProvider>
      </ErrorBoundary>
    )
  }

  if (state.matches('errored')) {
    error('[Auth]: Something went wrong', state.context)
  }

  return <AppShell />
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
      <LibraryShell />
      <MainWindowShell />
    </MainPageShell>
  )
}

var queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      useErrorBoundary: true,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
      retryOnMount: false,
      staleTime: Infinity,
      refetchOnReconnect: false,
    },
  },
})

var dehydrateState = dehydrate(queryClient)

export function RootProvider({
  client = queryClient,
  children,
}: {
  client?: QueryClient
  children: React.ReactNode
}) {
  var themeService = useInterpret(() => createThemeService())
  var authService = useInterpret(() => createAuthService(client))

  return (
    <QueryClientProvider client={client}>
      <Suspense fallback={<AppShell />}>
        <Hydrate state={dehydrateState}>
          <ThemeProvider value={themeService}>
            <AuthProvider value={authService}>{children}</AuthProvider>
          </ThemeProvider>
        </Hydrate>
      </Suspense>
    </QueryClientProvider>
  )
}

setLogger({
  log: (...args) => info(args.toString()),
  warn: (...args) => warn(args.toString()),
  // ✅ no more errors on the console
  error: () => {
    // noop
  },
})

/**
 * we need this to run tests without the `__TAURI_IPC__ not a function` error since we are not running tests inside Tauri (yet)
 */
//@ts-ignore
if (window.Cypress) {
  //@ts-ignore
  window.TAURI_IPC = function () {
    // noop
  }
  window.__TAURI_IPC__ = function TauriIPCMock() {
    // noop
  }
  window.__TAURI_METADATA__ = {
    __currentWindow: {
      label: 'test',
    },
    __windows: [
      {
        label: 'test',
      },
    ],
  }
}
