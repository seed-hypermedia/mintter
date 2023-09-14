import {GRPCClient} from '@mintter/shared'
import {
  config as tamaguiConfig,
  TamaguiProvider,
  TamaguiProviderProps,
  Theme,
} from '@mintter/ui'
import {QueryClientProvider} from '@tanstack/react-query'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'
import {createContext, ReactNode, useContext, useEffect} from 'react'
import {AppIPC, Event, EventCallback} from './app-ipc'
import {AppQueryClient} from './query-client'
import {WindowUtils} from './window-utils'

export type AppPlatform = typeof process.platform

export type AppContext = {
  platform: AppPlatform
  grpcClient: GRPCClient
  queryClient: AppQueryClient
  ipc: AppIPC
  externalOpen: (url: string) => Promise<void>
  windowUtils: WindowUtils
  saveCidAsFile: (cid: string, name: string) => Promise<void>
}

const AppContext = createContext<AppContext | null>(null)

export function AppContextProvider({
  children,
  platform,
  grpcClient,
  queryClient,
  ipc,
  externalOpen,
  windowUtils,
  saveCidAsFile,
}: {
  children: ReactNode
  platform: AppPlatform
  grpcClient: GRPCClient
  queryClient: AppQueryClient
  ipc: AppIPC
  externalOpen: (url: string) => Promise<void>
  windowUtils: WindowUtils
  saveCidAsFile: (cid: string, name: string) => Promise<void>
}) {
  if (!queryClient)
    throw new Error('queryClient is required for AppContextProvider')
  return (
    <AppContext.Provider
      value={{
        platform,
        grpcClient,
        queryClient,
        ipc,
        externalOpen,
        windowUtils,
        saveCidAsFile,
      }}
    >
      <QueryClientProvider client={queryClient.client}>
        <StyleProvider>{children}</StyleProvider>
        <ReactQueryDevtools />
      </QueryClientProvider>
    </AppContext.Provider>
  )
}

// TODO: OS theme change on linux
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

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context)
    throw new Error('useAppContext must be used within a AppContextProvider')

  return context
}

export function useGRPCClient(): GRPCClient {
  const context = useContext(AppContext)
  if (!context)
    throw new Error('useGRPCClient must be used within a AppContextProvider')
  return context.grpcClient
}

export function useIPC(): AppIPC {
  const context = useContext(AppContext)
  if (!context)
    throw new Error('useIPC must be used within a AppContextProvider')

  return context.ipc
}

export function useQueryInvalidator() {
  const context = useContext(AppContext)
  if (!context)
    throw new Error(
      'useQueryInvalidator must be used within a AppContextProvider',
    )

  return context.queryClient.invalidate
}

export function useWindowUtils(): WindowUtils {
  const context = useContext(AppContext)
  if (!context)
    throw new Error('useWindowUtils must be used within a AppContextProvider')

  return context.windowUtils
}

export function useListen<T = unknown>(
  cmd: string,
  handler: EventCallback<T>,
  deps: React.DependencyList = [],
) {
  const {listen} = useIPC()
  useEffect(() => {
    if (!listen) {
      throw new Error('useListen called before listen is defined')
    }
    let isSubscribed = true
    let unlisten: () => void

    listen(cmd, (event: Event<T>) => {
      if (!isSubscribed) {
        return unlisten()
      }

      handler(event)
    }).then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  }, deps)
}
