import {getInfo} from '@app/client'
import {queryKeys} from '@app/hooks'
import {themeMachine, ThemeProvider} from '@app/theme'
import {BrowserTracing} from '@sentry/tracing'
import {
  dehydrate,
  Hydrate,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'
import {onUpdaterEvent} from '@tauri-apps/api/updater'
import {useInterpret} from '@xstate/react'
import {lazy, Suspense} from 'react'
import {FallbackProps} from 'react-error-boundary'
import {Toaster} from 'react-hot-toast'
import {attachConsole, debug} from 'tauri-plugin-log-api'
import * as TauriSentry from 'tauri-plugin-sentry-api'
import {globalStyles} from './stitches.config'
import './styles/root.scss'
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

export function Root() {
  var themeService = useInterpret(() => themeMachine)
  globalStyles()

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense>
        <Hydrate state={dehydrateState}>
          <ThemeProvider value={themeService}>
            <App />
            <Toaster position="bottom-right" />
          </ThemeProvider>
        </Hydrate>
      </Suspense>
      <ReactQueryDevtools />
    </QueryClientProvider>
  )
}

function App() {
  // let [status, setStatus] = useState<
  //   'loading' | 'no_account' | 'error' | 'success'
  // >('loading')

  // useEffect(() => {
  //   getInfo()
  //     .then(() => {
  //       setStatus('success')
  //     })
  //     .catch((error) => {
  //       setStatus('no_account')
  //       // if (contains('account is not initialized')) {
  //       //   console.log('NO ACCOUNT'
  //       // } else {
  //       //   console.log('ERROR', error)
  //       // }
  //       // setStatus('error')
  //     })
  // }, [])
  let {data, status} = useQuery({
    queryKey: [queryKeys.GET_ACCOUNT_INFO],
    queryFn: () =>
      getInfo().catch((err) => {
        let message = err.metadata?.headersMap?.['grpc-message']
        // console.log('message', message)
        if (message?.[0] == 'account is not initialized') {
          return 'no account'
        }

        return new Error(err)
      }),
    refetchOnWindowFocus: false,
    onError: (err) => {
      console.log(`Root error: ${err}`)
      // setNotAccount(true)
    },
    retry: 2,
    retryDelay: (attempt) =>
      Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 30 * 1000),
    keepPreviousData: true,
  })

  if (data == 'no account') {
    return <OnboardingPage />
  }

  if (status == 'success') {
    return (
      <AppProvider>
        <Main />
      </AppProvider>
    )
  }

  if (status == 'error') {
    throw new Error('Root Error')
  }

  return <span>waiting...</span>
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

var queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      useErrorBoundary: true,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retryOnMount: false,
      staleTime: Infinity,
      refetchOnReconnect: false,
      onError: (err) => {
        console.log(`Query error: ${err}`)
      },
      retry: 4,
      retryDelay: (attempt) =>
        Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 30 * 1000),
      keepPreviousData: true,
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
