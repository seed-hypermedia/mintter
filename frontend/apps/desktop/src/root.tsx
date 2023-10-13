import '@tamagui/core/reset.css'
import '@tamagui/font-inter/css/400.css'
import '@tamagui/font-inter/css/700.css'
import {createGrpcWebTransport} from '@bufbuild/connect-web'
import {AppContextProvider, StyleProvider} from '@mintter/app/app-context'
import {AppIPC} from '@mintter/app/app-ipc'
import {AppError, AppErrorPage} from '@mintter/app/components/app-error'
import {DaemonStatusProvider} from '@mintter/app/node-status-context'
import Main from '@mintter/app/pages/main'
import {AppQueryClient, getQueryClient} from '@mintter/app/query-client'
import {toast} from '@mintter/app/toast'
import {NavState} from '@mintter/app/utils/navigation'
import {NavigationContainer} from '@mintter/app/utils/navigation-container'
import {WindowUtils} from '@mintter/app/window-utils'
import {BACKEND_HTTP_URL, createGRPCClient} from '@mintter/shared'
import {Spinner, YStack} from '@mintter/ui'
import {createTRPCReact} from '@trpc/react-query'
import {ipcLink} from 'electron-trpc/renderer'
import React, {Suspense, useEffect, useMemo, useState} from 'react'
import ReactDOM from 'react-dom/client'
import {ErrorBoundary} from 'react-error-boundary'
import {Toaster} from 'react-hot-toast'
import superjson from 'superjson'
import type {AppInfo, GoDaemonState} from './api'
import {AppRouter} from './api'
import {createIPC} from './ipc'
import './root.css'
import type {StateStream} from './stream'
import {client} from './trpc'
import {useListenAppEvent} from '@mintter/app/utils/window-events'

const logger = {
  log: wrapLogger(console.log),
  error: wrapLogger(console.error),
}

function wrapLogger(logFn: (...args: any[]) => void) {
  return (...input: any[]) => {
    logFn(
      ...input.map((item) => {
        if (typeof item === 'string') return item
        try {
          return JSON.stringify(item, null, 2)
        } catch {}
        return item // on main thread this will likely be rendered as [object Object]
      }),
    )
  }
}
const trpcReact = createTRPCReact<AppRouter>()

const loggingInterceptor: Interceptor = (next) => async (req) => {
  try {
    const result = await next(req)
    if (
      req.method.name === 'Register' &&
      req.service.typeName === 'com.mintter.daemon.v1alpha.Daemon'
    ) {
      logger.log(
        `🔃 to ${req.method.name} `,
        `${req.message.mnemonic.length} words HIDDEN FROM LOGS`,
        // @ts-ignore
        result?.message,
      )
      return result
    }
    if (
      req.method.name === 'GenMnemonic' &&
      req.service.typeName === 'com.mintter.daemon.v1alpha.Daemon'
    ) {
      logger.log(`🔃 to ${req.method.name} `, req.message, 'HIDDEN FROM LOGS')
      return result
    }
    // @ts-ignore
    logger.log(`🔃 to ${req.method.name} `)
    // logger.log(`🔃 to ${req.method.name} `, req.message, result?.message)
    return result
  } catch (e) {
    let error = e
    if (e.message.match('stream.getReader is not a function')) {
      error = new Error('RPC broken, try running yarn and ./dev gen')
    }
    logger.error(`🚨 to ${req.method.name} `, req.message, error)
    throw error
  }
}

const transport = createGrpcWebTransport({
  baseUrl: BACKEND_HTTP_URL,
  interceptors: [loggingInterceptor],
})

function useWindowUtils(ipc: AppIPC): WindowUtils {
  // const win = getCurrent()
  const [isMaximized, setIsMaximized] = useState<boolean | undefined>(false)
  const windowUtils = {
    maximize: () => {
      // toast.error('Not implemented maximize')
      setIsMaximized(true)
      ipc.send('maximize_window')
      // win.maximize()
    },
    unmaximize: () => {
      // toast.error('Not implemented')
      setIsMaximized(false)
      ipc.send('maximize_window')
      // win.unmaximize()
    },
    close: () => {
      // toast.error('Not implemented')
      ipc.send('close_window')
      // win.close()
    },
    minimize: () => {
      // toast.error('Not implemented')
      ipc.send('minimize_window')
      // win.minimize()
    },
    hide: () => {
      toast.error('Not implemented')
      // win.hide()
    },
    isMaximized,
  }
  return windowUtils
}

// @ts-expect-error
const daemonState: StateStream<GoDaemonState> = window.daemonState
// @ts-expect-error
const appInfo: AppInfo = window.appInfo

function useGoDaemonState(): GoDaemonState | undefined {
  const [state, setState] = useState<GoDaemonState | undefined>(
    daemonState.get(),
  )

  useEffect(() => {
    const updateHandler = (value: GoDaemonState) => {
      setState(value)
    }
    if (daemonState.get() !== state) {
      // this is hacky and shouldn't be needed but this fixes some race where daemonState has changed already
      setState(daemonState.get())
    }
    const sub = daemonState.subscribe(updateHandler)

    return () => {
      sub()
    }
  }, [])

  return state
}

function useStream<V>(stream: StateStream<V>): V {
  const [state, setState] = useState<V>(stream.get())
  useEffect(() => {
    return stream.subscribe(setState)
  }, [stream])
  return state
}

function MainApp({
  queryClient,
  ipc,
}: {
  queryClient: AppQueryClient
  ipc: AppIPC
}) {
  // @ts-expect-error
  const darkMode = useStream<boolean>(window.darkMode)
  const daemonState = useGoDaemonState()
  const grpcClient = useMemo(() => createGRPCClient(transport), [])
  const windowUtils = useWindowUtils(ipc)

  useListenAppEvent('triggerPeerSync', () => {
    grpcClient.daemon
      .forceSync({})
      .then(() => {
        toast.success('Peer Sync Started')
      })
      .catch((e) => {
        console.error('Failed to sync', e)
        toast.error('Sync failed!')
      })
  })

  useEffect(() => {
    // @ts-expect-error
    window.windowIsReady()
  }, [])

  if (daemonState?.t == 'ready') {
    return (
      <AppContextProvider
        grpcClient={grpcClient}
        platform={appInfo.platform()}
        queryClient={queryClient}
        ipc={ipc}
        externalOpen={async (url: string) => {
          ipc.send?.('open-external-link', url)
        }}
        saveCidAsFile={async (cid: string, name: string) => {
          ipc.send?.('save-file', {cid, name})
        }}
        windowUtils={windowUtils}
        darkMode={darkMode}
      >
        <Suspense
          fallback={
            <YStack fullscreen ai="center" jc="center">
              <Spinner />
            </YStack>
          }
        >
          <ErrorBoundary FallbackComponent={AppError}>
            <NavigationContainer
              initialNav={
                // @ts-expect-error
                window.initNavState
              }
            >
              <DaemonStatusProvider>
                <Main
                  className={
                    // this is used by editor.css which doesn't know tamagui styles, boooo!
                    darkMode ? 'mintter-app-dark' : 'mintter-app-light'
                  }
                />
              </DaemonStatusProvider>
            </NavigationContainer>
            <Toaster
              position="bottom-center"
              toastOptions={{className: 'toaster'}}
            />
          </ErrorBoundary>
        </Suspense>
      </AppContextProvider>
    )
  }

  if (daemonState?.t === 'error') {
    return (
      <StyleProvider darkMode={darkMode}>
        <AppErrorPage message={daemonState?.message} />
      </StyleProvider>
    )
  }

  return null
}

function ElectronApp() {
  const ipc = useMemo(() => createIPC(), [])
  const queryClient = useMemo(() => getQueryClient(ipc), [ipc])
  useEffect(() => {
    const sub = client.queryInvalidation.subscribe(undefined, {
      onData: (queryKey) => {
        queryClient.client.invalidateQueries(queryKey)
      },
    })
    return () => {
      sub.unsubscribe()
    }
  }, [queryClient])
  const trpcClient = useMemo(
    () =>
      trpcReact.createClient({
        links: [ipcLink()],
        transformer: superjson,
      }),
    [],
  )

  return (
    <trpcReact.Provider queryClient={queryClient.client} client={trpcClient}>
      <MainApp queryClient={queryClient} ipc={ipc} />
    </trpcReact.Provider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ElectronApp />
  </React.StrictMode>,
)
