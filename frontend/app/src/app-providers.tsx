import {HoverProvider} from '@app/editor/hover-context'
import {createHoverService} from '@app/editor/hover-machine'
import {createMainPageService} from '@app/main-page-machine'
import {
  BookmarksProvider,
  createBookmarkListMachine,
} from '@components/bookmarks'
import {useInterpret} from '@xstate/react'
import {PropsWithChildren, Suspense} from 'react'
import {Toaster} from 'react-hot-toast'
import {dehydrate, Hydrate, QueryClient, QueryClientProvider} from 'react-query'
import {interpret} from 'xstate'
import {AuthProvider} from './auth-context'
import {createAuthService} from './auth-machine'
import {createThemeService, ThemeProvider} from './theme'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      useErrorBoundary: true,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
      retryOnMount: false,
      staleTime: Infinity,
      refetchOnReconnect: false,
    },
  },
})

const dehydrateState = dehydrate(queryClient)

const initMainService = interpret(createMainPageService({client: queryClient}))

export const mainService = initMainService

type AppProvidersProps = {
  client?: QueryClient
  initialRoute?: string
  mainService?: typeof initMainService
}

export function AppProviders({
  children,
  client = queryClient,
  mainService = initMainService,
}: PropsWithChildren<AppProvidersProps>) {
  console.log('APP PROVIDER MAIN SERVICE', mainService)

  mainService.start()
  const themeService = useInterpret(() => createThemeService())
  const authService = useInterpret(() => createAuthService(client))
  const bookmarksService = useInterpret(() => createBookmarkListMachine(client))
  const hoverService = useInterpret(() => createHoverService())

  return (
    <QueryClientProvider client={client}>
      <AuthProvider value={authService}>
        <ThemeProvider value={themeService}>
          <Suspense fallback={<p>loading...</p>}>
            <Hydrate state={dehydrateState}>
              <HoverProvider value={hoverService}>
                <BookmarksProvider value={bookmarksService}>
                  {children}
                </BookmarksProvider>
              </HoverProvider>
              <Toaster position="bottom-right" />
            </Hydrate>
          </Suspense>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
