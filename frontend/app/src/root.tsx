import {getInfo} from '@app/client'
import {themeMachine, ThemeProvider} from '@app/theme'

import {
  dehydrate,
  Hydrate,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'
import {useInterpret} from '@xstate/react'
import {lazy, Suspense, useLayoutEffect, useState} from 'react'
import {FallbackProps} from 'react-error-boundary'
import {Toaster} from 'react-hot-toast'
// import 'show-keys'
import {globalStyles} from './stitches.config'

var OnboardingPage = lazy(() => import('./pages/onboarding'))
var AppProvider = lazy(() => import('./components/app-provider'))
var Main = lazy(() => import('./pages/main'))

export function Root() {
  var themeService = useInterpret(() => themeMachine)
  let [info, setInfo] = useState<undefined | boolean>(undefined)

  globalStyles()
  useLayoutEffect(() => {
    getInfo()
      .then(() => {
        setInfo(true)
      })
      .catch(() => {
        setInfo(false)
      })
  }, [])

  if (typeof info == 'undefined') {
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div></div>}>
        <Hydrate state={dehydrateState}>
          <ThemeProvider value={themeService}>
            {info ? (
              <AppProvider>
                <Main />
              </AppProvider>
            ) : (
              <OnboardingPage />
            )}
            <Toaster position="bottom-right" />
          </ThemeProvider>
        </Hydrate>
      </Suspense>
      <ReactQueryDevtools />
    </QueryClientProvider>
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

export function AppError({error, resetErrorBoundary}: FallbackProps) {
  return (
    <div role="alert">
      <p>Something went wrong loading the App:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

// setLogger({
//   log: (...args) => info(args.toString()),
//   warn: (...args) => warn(args.toString()),
//   // ✅ no more errors on the console
//   error: () => {
//     // noop
//   },
// })

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
