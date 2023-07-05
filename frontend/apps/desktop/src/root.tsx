// we can't uncomment this until we remove all the styles from the other systems :(
// import '@tamagui/web/reset.css'
import '@tamagui/polyfill-dev'

import {store} from '@app/app-store'
import Main from '@app/pages/main'
import {
  Button,
  TamaguiProvider,
  TamaguiProviderProps,
  Text,
  Theme,
  YStack,
} from '@mintter/ui'
import {dehydrate, Hydrate, QueryClientProvider} from '@tanstack/react-query'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'
import {onUpdaterEvent} from '@tauri-apps/api/updater'
import {useInterpret} from '@xstate/react'
import {Suspense, useEffect} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {Toaster} from 'react-hot-toast'
import {attachConsole, debug} from 'tauri-plugin-log-api'
import {globalStyles} from './stitches.config'

import {DaemonStatusProvider} from '@app/node-status-context'
import tamaguiConfig from '../tamagui.config'
import {appQueryClient} from './query-client'
import './styles/root.css'
import './styles/root.scss'
import './styles/toaster.scss'
import {NavigationProvider} from './utils/navigation'
import {listen, useListen} from '@app/ipc'

import('./updater')

// TauriSentry.init({
//   integrations: [new BrowserTracing()],

//   // Set tracesSampleRate to 1.0 to capture 100%
//   // of transactions for performance monitoring.
//   // We recommend adjusting this value in production
//   tracesSampleRate: 1.0,
// })

attachConsole()

onUpdaterEvent(({error, status}) => {
  debug(`Updater event. error: ${error} status: ${status}`)
})

export function Root() {
  globalStyles()

  return (
    <StyleProvider>
      <QueryClientProvider client={appQueryClient}>
        <Suspense>
          <Hydrate state={dehydrateState}>
            <ErrorBoundary FallbackComponent={AppError}>
              <NavigationProvider>
                <App />
              </NavigationProvider>
              <Toaster
                position="bottom-right"
                toastOptions={{className: 'toaster'}}
              />
            </ErrorBoundary>
          </Hydrate>
        </Suspense>
        <ReactQueryDevtools />
      </QueryClientProvider>
    </StyleProvider>
  )
}

function App() {
  usePageZoom()

  return (
    <DaemonStatusProvider>
      <Main />
    </DaemonStatusProvider>
  )
}

var dehydrateState = dehydrate(appQueryClient)

export function AppError({error, resetErrorBoundary}: FallbackProps) {
  return (
    <YStack role="alert" space>
      <Text>Something went wrong loading the App:</Text>
      <Text tag="pre">{error.message}</Text>
      <Button onPress={resetErrorBoundary}>Try again</Button>
    </YStack>
  )
}

function usePageZoom() {
  useEffect(() => {
    store.get<number>('zoom').then((value) => {
      let val = value ?? 1
      // @ts-ignore
      document.body.style = `zoom: ${val};`
    })
  }, [])
}

export function StyleProvider({
  children,
  ...rest
}: Omit<TamaguiProviderProps, 'config'>) {
  return (
    <TamaguiProvider
      config={tamaguiConfig}
      defaultTheme="light"
      disableRootThemeClass
      {...rest}
    >
      <Theme name="mint">{children}</Theme>
    </TamaguiProvider>
  )
}

// horrible hack during tauri/electron migration. used to defer execution until the ipc is ready
setTimeout(() => {
  // after migration we can move these back to module scope
  listen<string>('reset_zoom', (event) => {
    console.log('RESET ZOOM!', event)
    // @ts-ignore
    document.body.style = `zoom: 1;`
    store.set('zoom', 1)
  }).then((unlisten) => {
    // noop
  })

  listen<'zoomIn' | 'zoomOut'>('change_zoom', async (event) => {
    let currentZoom = (await store.get<number>('zoom')) || 1
    let newVal =
      event.payload == 'zoomIn' ? (currentZoom += 0.1) : (currentZoom -= 0.1)
    // @ts-ignore
    document.body.style = `zoom: ${newVal};`
    store.set('zoom', currentZoom)
  }).then((unlisten) => {
    // noop
  })
}, 1)
