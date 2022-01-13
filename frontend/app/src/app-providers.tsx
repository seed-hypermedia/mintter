import {useInterpret} from '@xstate/react'
import {PropsWithChildren, Suspense} from 'react'
import {Toaster} from 'react-hot-toast'
import {dehydrate, Hydrate, QueryClient, QueryClientProvider} from 'react-query'
import {ReactQueryDevtools} from 'react-query/devtools'
import {AuthProvider} from './auth-context'
import {authStateMachine} from './authstate-machine'
import {themeMachine, ThemeProvider} from './theme'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      useErrorBoundary: true,
    },
  },
})

const dehydrateState = dehydrate(queryClient)

export function AppProviders({children}: PropsWithChildren<unknown>) {
  const authService = useInterpret(authStateMachine)
  const themeService = useInterpret(themeMachine)
  return (
    <AuthProvider value={authService}>
      <ThemeProvider value={themeService}>
        <Suspense fallback={<p>loading...</p>}>
          <QueryClientProvider client={queryClient}>
            <Hydrate state={dehydrateState}>
              {children}
              <Toaster position="bottom-right" />
              <ReactQueryDevtools initialIsOpen={false} />
            </Hydrate>
          </QueryClientProvider>
        </Suspense>
      </ThemeProvider>
    </AuthProvider>
  )
}
