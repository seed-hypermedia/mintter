import {HoverProvider} from '@app/editor/hover-context'
import {createHoverService} from '@app/editor/hover-machine'
import {FilesProvider} from '@app/files-context'
import {createFilesMachine} from '@app/files-machine'
import {MainPageProvider} from '@app/main-page-context'
import {createMainPageService} from '@app/main-page-machine'
import {
  BookmarksProvider,
  createBookmarkListMachine,
} from '@components/bookmarks'
import {useInterpret} from '@xstate/react'
import {PropsWithChildren, Suspense} from 'react'
import {Toaster} from 'react-hot-toast'
import {dehydrate, Hydrate, QueryClient, QueryClientProvider} from 'react-query'
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

type AppProvidersProps = {
  client?: QueryClient
  initialRoute?: string
}

export function AppProviders({
  children,
  client = queryClient,
  initialRoute,
}: PropsWithChildren<AppProvidersProps>) {
  const themeService = useInterpret(() => createThemeService())
  const authService = useInterpret(() => createAuthService(client))
  const bookmarksService = useInterpret(() => createBookmarkListMachine(client))
  const hoverService = useInterpret(() => createHoverService())
  const filesService = useInterpret(() => createFilesMachine(client))
  const mainPageService = useInterpret(() =>
    createMainPageService(client, initialRoute),
  )

  return (
    <QueryClientProvider client={client}>
      <AuthProvider value={authService}>
        <ThemeProvider value={themeService}>
          <Suspense fallback={<p>loading...</p>}>
            <Hydrate state={dehydrateState}>
              <MainPageProvider value={mainPageService}>
                <HoverProvider value={hoverService}>
                  <FilesProvider value={filesService}>
                    <BookmarksProvider value={bookmarksService}>
                      {children}
                    </BookmarksProvider>
                  </FilesProvider>
                </HoverProvider>
              </MainPageProvider>
              <Toaster position="bottom-right" />
            </Hydrate>
          </Suspense>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
