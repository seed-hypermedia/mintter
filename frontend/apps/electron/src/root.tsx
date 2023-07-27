import React, {useMemo, useState} from 'react'
import ReactDOM from 'react-dom/client'
import Main from '@mintter/app/src/pages/main'
import {createGrpcWebTransport} from '@bufbuild/connect-web'
import {createGRPCClient} from '@mintter/shared'
import {toast} from '@mintter/app/src/toast'
import {WindowUtils} from '@mintter/app/src/window-utils'
import {AppContextProvider} from '@mintter/app/src/app-context'
import {AppQueryClient, getQueryClient} from '@mintter/app/src/query-client'
import {createIPC} from './ipc'
import {NavigationProvider} from '@mintter/app/src/utils/navigation'
import {DaemonStatusProvider} from '@mintter/app/src/node-status-context'
import {Toaster} from 'react-hot-toast'
import './root.css'
import {BACKEND_HTTP_URL} from '@mintter/app/src/constants'
import {ipcLink} from 'electron-trpc/renderer'
import {AppRouter} from './api'
import {createTRPCReact} from '@trpc/react-query'
import superjson from 'superjson'
import {AppIPC} from '@mintter/app/src/app-ipc'

const trpcReact = createTRPCReact<AppRouter>()

const transport = createGrpcWebTransport({
  baseUrl: BACKEND_HTTP_URL,
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

function MainApp({
  queryClient,
  ipc,
}: {
  queryClient: AppQueryClient
  ipc: AppIPC
}) {
  const grpcClient = useMemo(() => createGRPCClient(transport), [])
  const windowUtils = useWindowUtils()
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
        toast.error('Not implemented saveCidAsFile: ' + cid + name)
      }}
      windowUtils={windowUtils}
    >
      <NavigationProvider>
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
