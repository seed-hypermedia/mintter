import React from 'react'
import {ReactQueryDevtools} from 'react-query-devtools'
import {BrowserRouter as Router} from 'react-router-dom'
import {FullPageSpinner} from 'components/fullPageSpinner'
import {ThemeProvider} from 'shared/themeContext'
import {ProfileProvider} from 'shared/profileContext'
import {MintterProvider} from 'shared/mintterContext'
import {ToastProvider, DefaultToast} from 'react-toast-notifications'
import {SidePanelProvider} from './sidePanel'
import {BlockMenuProvider} from '@mintter/editor'
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
    <DefaultToast {...props}>
      <div className="break-all">{children}</div>
    </DefaultToast>
  )
}

export function AppProviders({children}) {
  return (
    <>
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
    </>
  )
}
