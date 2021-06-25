import {Toaster} from 'react-hot-toast'
import {QueryClient, QueryClientProvider} from 'react-query'
import {ReactQueryDevtools} from 'react-query/devtools'

import {Theme} from '@mintter/ui'

import {SidePanelProvider} from './sidepanel'
import {Suspense} from 'react'
import {AppSpinner} from './components/app-spinner'

export const queryClient = new QueryClient()

export function AppProviders({children}: {children: React.ReactNode}) {
  return (
    <Theme>
      <Suspense fallback={<AppSpinner isFullScreen />}>
        <QueryClientProvider client={queryClient}>
          <SidePanelProvider>{children}</SidePanelProvider>
          <Toaster position="bottom-right" />
          {/** @TODO Uncommenting this causes an error with react-query. We should fix this */}
          {/* <ReactQueryDevtools initialIsOpen={false} /> */}
        </QueryClientProvider>
      </Suspense>
    </Theme>
  )
}
