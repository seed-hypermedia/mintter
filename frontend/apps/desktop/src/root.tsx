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
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'
import {onUpdaterEvent} from '@tauri-apps/api/updater'
import {Suspense, useEffect, useMemo, useState} from 'react'
import {ErrorBoundary, FallbackProps} from 'react-error-boundary'
import {Toaster} from 'react-hot-toast'
import {attachConsole, debug} from 'tauri-plugin-log-api'
import {DaemonStatusProvider} from '@app/node-status-context'
import tamaguiConfig from '../tamagui.config'
import {getQueryClient} from '@mintter/app/src/query-client'
import './styles/root.css'
import './styles/root.scss'
import './styles/toaster.scss'
import {NavigationProvider} from './utils/navigation'
import {createIPC, listen} from '@app/ipc'
import {createGRPCClient} from '@mintter/shared'
import {transport} from './api-clients'
import {AppContextProvider, AppPlatform, WindowUtils} from '@mintter/app'
import {open} from '@tauri-apps/api/shell'
import {getCurrent} from '@tauri-apps/api/window'
import {saveCidAsFile} from './save-cid-as-file'

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

const osPlatform = import.meta.env.TAURI_PLATFORM

function appPlatform(): AppPlatform {
  if (osPlatform === 'linux') return 'linux'
  if (osPlatform === 'macos') return 'macos'
  if (osPlatform === 'windows') return 'windows'
  throw new Error(`Unsupported platform: ${osPlatform}`)
}

function useWindowUtils(): WindowUtils {
  const win = getCurrent()
  const [isMaximized, setIsMaximized] = useState<boolean | undefined>()
  useEffect(() => {
    win.isMaximized().then((v) => setIsMaximized(v))
  }, [])
  const windowUtils = {
    maximize: () => {
      setIsMaximized(true)
      win.maximize()
    },
    unmaximize: () => {
      setIsMaximized(false)
      win.unmaximize()
    },
    close: () => {
      win.close()
    },
    minimize: () => {
      win.minimize()
    },
    hide: () => {
      win.hide()
    },
    isMaximized,
  }
  return windowUtils
}

export function Root() {
  const ipc = useMemo(() => createIPC(), [])
  const grpcClient = useMemo(() => createGRPCClient(transport), [])
  const queryClient = useMemo(() => getQueryClient(ipc), [ipc])
  const windowUtils = useWindowUtils()

  console.log(`== ~ Root ~ windowUtils:`, {
    ipc,
    grpcClient,
    queryClient,
    windowUtils,
  })
  return (
    <AppContextProvider
      grpcClient={grpcClient}
      queryClient={queryClient}
      platform={appPlatform()}
      ipc={ipc}
      externalOpen={async (url: string) => {
        await open(url)
      }}
      windowUtils={windowUtils}
      saveCidAsFile={saveCidAsFile}
    >
      <StyleProvider>
        <Suspense>
          <ErrorBoundary FallbackComponent={AppError}>
            <NavigationProvider>
              <App />
            </NavigationProvider>
            <Toaster
              position="bottom-right"
              toastOptions={{className: 'toaster'}}
            />
          </ErrorBoundary>
        </Suspense>
      </StyleProvider>
    </AppContextProvider>
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
      // @ts-ignore
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
