import type {Interceptor} from '@connectrpc/connect'
import {createGrpcWebTransport} from '@connectrpc/connect-web'
import {AppContextProvider, StyleProvider} from '@mintter/app/app-context'
import {AppIPC} from '@mintter/app/app-ipc'
import {AppErrorContent, RootAppError} from '@mintter/app/components/app-error'
import {DaemonStatusProvider} from '@mintter/app/node-status-context'
import Main from '@mintter/app/pages/main'
import {getQueryClient} from '@mintter/app/query-client'
import {NavigationContainer} from '@mintter/app/utils/navigation-container'
import {useListenAppEvent} from '@mintter/app/utils/window-events'
import {WindowUtils} from '@mintter/app/window-utils'
import {API_HTTP_URL, createGRPCClient} from '@mintter/shared'
import type {StateStream} from '@mintter/shared/src/utils/stream'
import {Spinner, Toaster, YStack, toast, useStream} from '@mintter/ui'
import '@tamagui/core/reset.css'
import '@tamagui/font-inter/css/400.css'
import '@tamagui/font-inter/css/700.css'
import {ipcLink} from 'electron-trpc/renderer'
import React, {Suspense, useEffect, useState} from 'react'
import ReactDOM from 'react-dom/client'
import {ErrorBoundary} from 'react-error-boundary'
import superjson from 'superjson'
import type {GoDaemonState} from './daemon'
import {createIPC} from './ipc'
import type {AppInfoType} from './preload'
import './root.css'
import {client, trpc} from './trpc'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)

function Root() {
  const darkMode = useStream<boolean>(window.darkMode)
  const daemonState = useGoDaemonState()
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

  useTrpcSubscribe()

  useEffect(() => {
    // @ts-expect-error
    window.windowIsReady()
  }, [])

  return (
    <trpc.Provider queryClient={queryClient.client} client={trpcClient}>
      {daemonState?.t == 'ready' ? (
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
                <DaemonStatusProvider>
                  <Main
                    className={
                      // this is used by editor.css which doesn't know tamagui styles, boooo!
                      darkMode ? 'mintter-app-dark' : 'mintter-app-light'
                    }
                  />
                </DaemonStatusProvider>
              </NavigationContainer>
              <Toaster />
            </ErrorBoundary>
          </Suspense>
        </AppContextProvider>
      ) : daemonState?.t == 'error' ? (
        <StyleProvider darkMode={darkMode}>
          <AppErrorContent message={daemonState?.message} />
        </StyleProvider>
      ) : null}
    </trpc.Provider>
  )
}

// ==============================

const logger = {
  log: wrapLogger(console.log),
  error: wrapLogger(console.error),
}

const ipc = createIPC()
const queryClient = getQueryClient(ipc)

const trpcClient = trpc.createClient({
  links: [ipcLink()],
  transformer: superjson,
})

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
  // 'Groups.GetGroup',
  // 'Groups.ListContent',
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

const grpcClient = createGRPCClient(transport)

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

function useTrpcSubscribe() {
  const utils = trpc.useContext()

  useEffect(() => {
    const sub = client.queryInvalidation.subscribe(undefined, {
      onData: (value: unknown[]) => {
        if (!value) return
        if (typeof value == 'undefined') return
        if (value[0] === 'trpc.experiments.get') {
          utils.experiments?.get?.invalidate?.()
        } else if (value[0] === 'trpc.pins.get') {
          utils.pins.get.invalidate()
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
        } else if (value[0] === 'trpc.recents.getDocVariants') {
          utils.recents.getDocVariants.invalidate()
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
}
