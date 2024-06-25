import { GRPCClient } from '@shm/shared'
import { TamaguiProvider, TamaguiProviderProps, View } from '@shm/ui'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactNode, useMemo } from 'react'

import tamaguiConfig from '../tamagui.config'
import { AppIPC } from './app-ipc'
import { useExperiments } from './models/experiments'

import { AppContext, AppPlatform } from './app-context'
import { WindowUtils } from './models/window-utils'
import { AppQueryClient } from './query-client'


export function AppContextProvider({
    children,
    platform,
    grpcClient,
    queryClient,
    ipc,
    externalOpen,
    windowUtils,
    saveCidAsFile,
    darkMode,
}: {
    children: ReactNode
    platform: AppPlatform
    grpcClient: GRPCClient
    queryClient: AppQueryClient
    ipc: AppIPC
    externalOpen: (url: string) => Promise<void>
    windowUtils: WindowUtils
    saveCidAsFile: (cid: string, name: string) => Promise<void>
    darkMode: boolean
}) {
    const appCtx = useMemo(
        () => ({
            // platform: 'win32', // to test from macOS
            platform,
            grpcClient,
            queryClient,
            ipc,
            externalOpen,
            windowUtils,
            saveCidAsFile,
        }),
        [],
    )
    if (!queryClient)
        throw new Error('queryClient is required for AppContextProvider')
    return (
        <AppContext.Provider value={appCtx}>
            <QueryClientProvider client={queryClient.client}>
                <StyleProvider darkMode={darkMode}>{children}</StyleProvider>
                <ReactQueryTools />
            </QueryClientProvider>
        </AppContext.Provider>
    )
}

function ReactQueryTools() {
    const { data: experiments } = useExperiments()
    return experiments?.developerTools ? (
        <View userSelect="none">
            <ReactQueryDevtools />
        </View>
    ) : null
}

export function StyleProvider({
    children,
    darkMode,
    ...rest
}: Omit<TamaguiProviderProps, 'config'> & { darkMode: boolean }) {
    return (
        <TamaguiProvider
            // @ts-ignore
            config={tamaguiConfig}
            // TODO: find a way to add this props without breaking all the styles
            // disableInjectCSS
            // disableRootThemeClass
            className={darkMode ? 'seed-app-dark' : 'seed-app-light'}
            defaultTheme={darkMode ? 'dark' : 'light'}
            {...rest}
        >
            {children}
        </TamaguiProvider>
    )
}
