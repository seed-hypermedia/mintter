import React, {Suspense, FC} from 'react'
import {Toaster} from 'react-hot-toast'
import {QueryClient, QueryClientProvider} from 'react-query'
import {ReactQueryDevtools} from 'react-query/devtools'
import {BrowserRouter as Router} from 'react-router-dom'

import {Theme} from '@mintter/ui'
import {AppSpinner} from './components/app-spinner'

import {SidePanelProvider} from './sidepanel'

export const queryClient = new QueryClient()

export function AppProviders({children}: {children: React.ReactNode}) {
  return (
    <Theme>
      <Suspense fallback={<AppSpinner isFullScreen />}>
        <QueryClientProvider client={queryClient}>
          <SidePanelProvider>
            <Router>{children}</Router>
          </SidePanelProvider>
          <Toaster position="bottom-right" />
          {/** @TODO Uncommenting this causes an error with react-query. We should fix this */}
          {/* <ReactQueryDevtools initialIsOpen={false} /> */}
        </QueryClientProvider>
      </Suspense>
    </Theme>
  )
}
