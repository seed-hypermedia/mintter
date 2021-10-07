import {Theme} from '@mintter/ui/theme'
import {PropsWithChildren, Suspense} from 'react'
import {Toaster} from 'react-hot-toast'
import {QueryClient, QueryClientProvider} from 'react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      useErrorBoundary: true,
    },
  },
})

export function AppProviders({children}: PropsWithChildren<unknown>) {
  return (
    <Theme>
      <Suspense fallback={<p>loading...</p>}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster position="bottom-right" />
          {/** @TODO Uncommenting this causes an error with react-query. We should fix this */}
          {/* <ReactQueryDevtools initialIsOpen={false} /> */}
        </QueryClientProvider>
      </Suspense>
    </Theme>
  )
}
