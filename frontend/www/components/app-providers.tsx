import {ReactQueryDevtools} from 'react-query-devtools'
import {ReactQueryConfigProvider} from 'react-query'
// import {AnimatePresence} from 'framer-motion'
import {BrowserRouter as Router} from 'react-router-dom'
import {ThemeProvider} from 'shared/themeContext'
import {ProfileProvider} from 'shared/profileContext'
import {MintterProvider} from 'shared/mintterContext'
import {ToastProvider, DefaultToast} from 'react-toast-notifications'

function Toast({children, ...props}) {
  return (
    <DefaultToast {...props}>
      <div className="break-all">{children}</div>
    </DefaultToast>
  )
}

export function AppProviders({children, ...props}) {
  return (
    <>
      <ReactQueryDevtools initialIsOpen={false} />
      <Router>
        <ReactQueryConfigProvider config={{refetchInterval: 5000}}>
          <ThemeProvider>
            <ProfileProvider>
              <MintterProvider>
                <ToastProvider autoDismiss={true} components={{Toast}}>
                  {children}
                </ToastProvider>
              </MintterProvider>
            </ProfileProvider>
          </ThemeProvider>
        </ReactQueryConfigProvider>
      </Router>
    </>
  )
}
