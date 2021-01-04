import React from 'react'
import {ReactQueryDevtools} from 'react-query-devtools'
import {BrowserRouter as Router} from 'react-router-dom'
import {FullPageSpinner} from 'components/fullpage-spinner'
import {ThemeProvider} from 'shared/theme-context'
import {ProfileProvider} from 'shared/profile-context'
import {MintterProvider} from 'shared/mintter-context'
import {ToastProvider, DefaultToast} from 'react-toast-notifications'
import {SidePanelProvider} from './sidepanel'
import {BlockMenuProvider} from '../editor/block-plugin/components/blockmenu-context'
import {ReactQueryConfigProvider} from 'react-query'

const queryConfig = {
  queries: {
    useErrorBoundary: true,
    refetchOnWindowFocus: false,
    retry(failureCount, error) {
      if (error.status === 404) return false
      else if (failureCount < 2) return true
      else return false
    },
  },
}

export function Toast({children, ...props}) {
  return (
    <DefaultToast {...props} role="alert">
      <div className="break-all">{children}</div>
    </DefaultToast>
  )
}

export function AppProviders({children}) {
  return (
    <React.Suspense fallback={<FullPageSpinner />}>
      <ReactQueryConfigProvider config={queryConfig}>
        <ReactQueryDevtools initialIsOpen={false} />
        <Router>
          <ThemeProvider>
            <ProfileProvider>
              <MintterProvider>
                <ToastProvider autoDismiss={true} components={{Toast}}>
                  <BlockMenuProvider>
                    <SidePanelProvider>{children}</SidePanelProvider>
                  </BlockMenuProvider>
                </ToastProvider>
              </MintterProvider>
            </ProfileProvider>
          </ThemeProvider>
        </Router>
      </ReactQueryConfigProvider>
    </React.Suspense>
  )
}
