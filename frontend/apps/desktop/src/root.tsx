import {AppContextProvider, StyleProvider} from '@/app-context-provider'
import {AppIPC} from '@/app-ipc'
import {WindowUtils} from '@/models/window-utils'
import {NavigationContainer} from '@/utils/navigation-container'
import {useListenAppEvent} from '@/utils/window-events'
import type {Interceptor} from '@connectrpc/connect'
import {createGrpcWebTransport} from '@connectrpc/connect-web'
import {API_HTTP_URL, createGRPCClient} from '@shm/shared'
import type {StateStream} from '@shm/shared/src/utils/stream'
import {Spinner, Toaster, YStack, toast, useStream} from '@shm/ui'
import '@tamagui/core/reset.css'
import '@tamagui/font-inter/css/400.css'
import '@tamagui/font-inter/css/700.css'
import {ipcLink} from 'electron-trpc/renderer'
import React, {Suspense, useEffect, useMemo, useState} from 'react'
import ReactDOM from 'react-dom/client'
import {ErrorBoundary} from 'react-error-boundary'
import superjson from 'superjson'
import {AccountWizardDialog} from './app-account'
import {AppErrorContent, RootAppError} from './components/app-error'
import type {GoDaemonState} from './daemon'
import {createIPC} from './ipc'
import Main from './pages/main'
import type {AppInfoType} from './preload'
import {AppQueryClient, getQueryClient} from './query-client'
import './root.css'
import {client, trpc} from './trpc'

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

const securitySensitiveMethods = new Set([
  'Daemon.Register',
  'Daemon.GenMnemonic',
])
const enabledLogMessages = new Set<string>([
  // 'Accounts.ListAccounts',
  // 'Comments.ListComments',
  // etc.. add the messages you need to see here, please comment out before committing!
])
const hiddenLogMessages = new Set<string>([
  'Daemon.GetInfo',
  'Networking.GetPeerInfo',
])
const loggingInterceptor: Interceptor = (next) => async (req) => {
  const serviceLabel = req.service.typeName.split('.').at(-1)
  const methodFullname = `${serviceLabel}.${req.method.name}`
  const isSensitive = securitySensitiveMethods.has(methodFullname)
  try {
    const result = await next(req)
    if (
      enabledLogMessages.has(methodFullname) &&
      !hiddenLogMessages.has(methodFullname)
    ) {
      const request = req.message
      const response = result?.message
      logger.log(`🔃 to ${methodFullname}`, request, response)
    } else if (!hiddenLogMessages.has(methodFullname)) {
      logger.log(`🔃 to ${methodFullname}`)
    }
    return result
  } catch (e) {
    let error = e
    if (e.message.match('stream.getReader is not a function')) {
      error = new Error('RPC broken, try running yarn and ./dev gen')
    }
    if (isSensitive) {
      logger.error(`🚨 to ${methodFullname} `, 'HIDDEN FROM LOGS', error)
      throw error
    }
    logger.error(`🚨 to ${methodFullname} `, req.message, error)
    throw error
  }
}

const transport = createGrpcWebTransport({
  baseUrl: API_HTTP_URL,
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
    quit: () => {
      ipc.send('quit_app')
    },
  }
  return windowUtils
}

// @ts-expect-error
const daemonState: StateStream<GoDaemonState> = window.daemonState
// @ts-expect-error
const appInfo: AppInfoType = window.appInfo

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

function MainApp({
  queryClient,
  ipc,
}: {
  queryClient: AppQueryClient
  ipc: AppIPC
}) {
  const darkMode = useStream<boolean>(window.darkMode)
  const daemonState = useGoDaemonState()
  const grpcClient = useMemo(() => createGRPCClient(transport), [])
  const windowUtils = useWindowUtils(ipc)
  const utils = trpc.useContext()

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
    const sub = client.queryInvalidation.subscribe(undefined, {
      onData: (value: unknown[]) => {
        if (!value) return
        if (value[0] === 'trpc.experiments.get') {
          utils.experiments.get.invalidate()
        } else if (value[0] === 'trpc.favorites.get') {
          utils.favorites.get.invalidate()
        } else if (value[0] === 'trpc.comments.getCommentDrafts') {
          utils.comments.getCommentDrafts.invalidate()
        } else if (value[0] === 'trpc.gatewaySettings.getGatewayUrl') {
          utils.gatewaySettings.getGatewayUrl.invalidate()
        } else if (value[0] === 'trpc.gatewaySettings.getPushOnCopy') {
          utils.gatewaySettings.getPushOnCopy.invalidate()
        } else if (value[0] === 'trpc.gatewaySettings.getPushOnPublish') {
          utils.gatewaySettings.getPushOnPublish.invalidate()
        } else if (value[0] === 'trpc.recents.getRecents') {
          utils.recents.getRecents.invalidate()
        } else if (value[0] === 'trpc.appSettings.getAutoUpdatePreference') {
          utils.appSettings.getAutoUpdatePreference.invalidate()
        } else if (queryClient.client) {
          queryClient.client.invalidateQueries(value)
        }
      },
    })
    return () => {
      sub.unsubscribe()
    }
  }, [queryClient.client, utils])

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
          <ErrorBoundary
            FallbackComponent={RootAppError}
            onReset={() => {
              window.location.reload()
            }}
          >
            <NavigationContainer
              initialNav={
                // @ts-expect-error
                window.initNavState
              }
            >
              <AccountWizardDialog />
              <Main
                className={
                  // this is used by editor.css which doesn't know tamagui styles, boooo!
                  darkMode ? 'seed-app-dark' : 'seed-app-light'
                }
              />
            </NavigationContainer>
            <Toaster
            // position="bottom-center"
            // toastOptions={{className: 'toaster'}}
            />
          </ErrorBoundary>
        </Suspense>
      </AppContextProvider>
    )
  }

  if (daemonState?.t == 'error') {
    console.error('Daemon error', daemonState?.message)
    return (
      <StyleProvider darkMode={darkMode}>
        <AppErrorContent message={daemonState?.message} />
      </StyleProvider>
    )
  }

  return null
}

function ElectronApp() {
  const ipc = useMemo(() => createIPC(), [])
  const queryClient = useMemo(() => getQueryClient(ipc), [ipc])

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [ipcLink()],
        transformer: superjson,
      }),
    [],
  )

  return (
    <trpc.Provider queryClient={queryClient.client} client={trpcClient}>
      <MainApp queryClient={queryClient} ipc={ipc} />
    </trpc.Provider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ElectronApp />
  </React.StrictMode>,
)
