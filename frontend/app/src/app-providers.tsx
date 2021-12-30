import {Theme} from '@mintter/ui/theme'
import {useInterpret} from '@xstate/react'
import {PropsWithChildren, Suspense} from 'react'
import {Toaster} from 'react-hot-toast'
import {dehydrate, Hydrate, QueryClient, QueryClientProvider} from 'react-query'
import {ReactQueryDevtools} from 'react-query/devtools'
import {AuthProvider} from './auth-context'
import {authStateMachine} from './authstate-machine'

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
  return (
    <AuthProvider value={authService}>
      <Theme>
        <Suspense fallback={<p>loading...</p>}>
          <QueryClientProvider client={queryClient}>
            <Hydrate state={dehydrateState}>
              {children}
              <Toaster position="bottom-right" />
              <ReactQueryDevtools initialIsOpen={false} />
            </Hydrate>
          </QueryClientProvider>
        </Suspense>
      </Theme>
    </AuthProvider>
  )
}
