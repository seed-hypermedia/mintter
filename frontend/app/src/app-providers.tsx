import {Theme} from '@mintter/ui/theme'
import {PropsWithChildren, Suspense} from 'react'
import {Toaster} from 'react-hot-toast'
import {dehydrate, Hydrate, QueryClient, QueryClientProvider} from 'react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      useErrorBoundary: true,
    },
  },
})
console.log('🚀 ~ file: app-providers.tsx ~ line 13 ~ queryClient', queryClient)

const dehydrateState = dehydrate(queryClient)

export function AppProviders({children}: PropsWithChildren<unknown>) {
  return (
    <Theme>
      <Suspense fallback={<p>loading...</p>}>
        <QueryClientProvider client={queryClient}>
          <Hydrate state={dehydrateState}>
            {children}
            <Toaster position="bottom-right" />
            {/** @TODO Uncommenting this causes an error with react-query. We should fix this */}
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
          </Hydrate>
        </QueryClientProvider>
      </Suspense>
    </Theme>
  )
}
