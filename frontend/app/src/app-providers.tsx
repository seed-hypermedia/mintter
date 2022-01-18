import {useInterpret} from '@xstate/react'
import {PropsWithChildren, Suspense} from 'react'
import {Toaster} from 'react-hot-toast'
import {dehydrate, Hydrate, QueryClient, QueryClientProvider} from 'react-query'
import {AuthProvider} from './auth-context'
import {createAuthMachine} from './authstate-machine'
import * as localApi from './client'
import {themeMachine, ThemeProvider} from './theme'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      useErrorBoundary: true,
    },
  },
})

const dehydrateState = dehydrate(queryClient)

type AppProvidersProps = {
  client?: QueryClient
  api?: any
}

export function AppProviders({children, client = queryClient, api = localApi}: PropsWithChildren<AppProvidersProps>) {
  const authService = useInterpret(() => createAuthMachine({getInfo: api.getInfo}))
  const themeService = useInterpret(() => themeMachine)
  return (
    <QueryClientProvider client={client}>
      <AuthProvider value={authService}>
        <ThemeProvider value={themeService}>
          <Suspense fallback={<p>loading...</p>}>
            <Hydrate state={dehydrateState}>
              {children}
              <Toaster position="bottom-right" />
            </Hydrate>
          </Suspense>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
