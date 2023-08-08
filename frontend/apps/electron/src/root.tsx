import React, {useEffect, useMemo, useState, useSyncExternalStore} from 'react'
import ReactDOM from 'react-dom/client'
import Main from '@mintter/app/src/pages/main'
import {Interceptor, createGrpcWebTransport} from '@bufbuild/connect-web'
import {createGRPCClient} from '@mintter/shared'
import {toast} from '@mintter/app/src/toast'
import {WindowUtils} from '@mintter/app/src/window-utils'
import {AppContextProvider, StyleProvider} from '@mintter/app/src/app-context'
import {AppQueryClient, getQueryClient} from '@mintter/app/src/query-client'
import {createIPC} from './ipc'
import {NavRoute, NavigationProvider} from '@mintter/app/src/utils/navigation'
import {DaemonStatusProvider} from '@mintter/app/src/node-status-context'
import {Toaster} from 'react-hot-toast'
import './root.css'
import {BACKEND_HTTP_URL} from '@mintter/app/src/constants'
import {ipcLink} from 'electron-trpc/renderer'
import {AppRouter} from './api'
import {createTRPCReact} from '@trpc/react-query'
import superjson from 'superjson'
import {AppIPC} from '@mintter/app/src/app-ipc'
import {decodeRouteFromPath} from '@mintter/app/src/utils/route-encoding'
import {client} from './trpc'
import type {GoDaemonState} from './api'
import type {StateStream} from './stream'
import {AppErrorPage} from '@mintter/app/src/components/app-error'
import {Spinner, XStack, YStack} from '@mintter/ui'

const trpcReact = createTRPCReact<AppRouter>()

const loggingInterceptor: Interceptor = (next) => async (req) => {
  try {
    const result = await next(req)
    // @ts-ignore
    console.log(`🔃 to ${req.method.name} `, req.message, result?.message)
    return result
  } catch (e) {
    let error = e
    if (e.message.match('stream.getReader is not a function')) {
      error = new Error('RPC broken, try running yarn and ./dev gen')
    }
    console.error(`🚨 to ${req.method.name} `, req.message, error)
    throw error
  }
}

const transport = createGrpcWebTransport({
  baseUrl: BACKEND_HTTP_URL,
  interceptors: import.meta.env.PROD ? undefined : [loggingInterceptor],
})

function useWindowUtils(): WindowUtils {
  // const win = getCurrent()
  const [isMaximized, setIsMaximized] = useState<boolean | undefined>()
  const windowUtils = {
    maximize: () => {
      toast.error('Not implemented maximize')
      setIsMaximized(true)
      // win.maximize()
    },
    unmaximize: () => {
      toast.error('Not implemented')
      setIsMaximized(false)
      // win.unmaximize()
    },
    close: () => {
      toast.error('Not implemented')
      // win.close()
    },
    minimize: () => {
      toast.error('Not implemented')
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
  const daemonState = useGoDaemonState()
  const grpcClient = useMemo(() => createGRPCClient(transport), [])
  const windowUtils = useWindowUtils()
  // @ts-expect-error
  const initRoute = useStream<NavRoute>(window.initRoute)
  const initialNav = useMemo(() => {
    return {
      routes: [initRoute],
      routeIndex: 0,
      lastAction: null,
    }
  }, [initRoute])
  if (!daemonState) return null
  if (daemonState?.t === 'error') {
    return (
      <StyleProvider>
        <AppErrorPage message={daemonState?.message} />
      </StyleProvider>
    )
  }
  if (daemonState?.t !== 'ready') {
    return (
      <StyleProvider>
        <XStack
          flex={1}
          minWidth={'100vw'}
          justifyContent="center"
          alignItems="center"
        >
          <Spinner />
        </XStack>
      </StyleProvider>
    )
  }

  return (
    <AppContextProvider
      grpcClient={grpcClient}
      platform="macos"
      queryClient={queryClient}
      ipc={ipc}
      externalOpen={async (url: string) => {
        toast.error('Not implemented open: ' + url)
      }}
      saveCidAsFile={async (cid: string, name: string) => {
        ipc.send?.('save-file', {cid, name})
      }}
      windowUtils={windowUtils}
    >
      <NavigationProvider initialNav={initialNav}>
        <DaemonStatusProvider>
          <Main />
        </DaemonStatusProvider>
      </NavigationProvider>
      <Toaster position="bottom-right" toastOptions={{className: 'toaster'}} />
    </AppContextProvider>
  )
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
