import {getInfo} from '@app/client'
import {themeMachine, ThemeProvider} from '@app/theme'
import {BrowserTracing} from '@sentry/tracing'
import {
  dehydrate,
  Hydrate,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'
import {onUpdaterEvent} from '@tauri-apps/api/updater'
import {useInterpret} from '@xstate/react'
import {lazy, StrictMode, Suspense, useLayoutEffect, useState} from 'react'
import {createRoot} from 'react-dom/client'
import {FallbackProps} from 'react-error-boundary'
import {Toaster} from 'react-hot-toast'
import {attachConsole, debug} from 'tauri-plugin-log-api'
import * as TauriSentry from 'tauri-plugin-sentry-api'
import {globalStyles} from './stitches.config'

const OnboardingPage = lazy(() => import('./pages/onboarding'))
const AppProvider = lazy(() => import('./components/app-provider'))
const Main = lazy(() => import('./pages/main'))

TauriSentry.init({
  integrations: [new BrowserTracing()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
})

attachConsole()

onUpdaterEvent(({error, status}) => {
  debug(`Updater event. error: ${error} status: ${status}`)
})

var container = document.getElementById('root')
if (!container) throw new Error('No `root` html element')
var root = createRoot(container)

root.render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

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

const queryClient = new QueryClient({
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

const dehydrateState = dehydrate(queryClient)

export function AppError({error, resetErrorBoundary}: FallbackProps) {
  return (
    <div role="alert">
      <p>Something went wrong loading the App:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}
