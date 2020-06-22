import {ReactQueryDevtools} from 'react-query-devtools'
// import {AnimatePresence} from 'framer-motion'
import {BrowserRouter as Router} from 'react-router-dom'
import {ThemeProvider} from 'shared/themeContext'
import {ProfileProvider} from 'shared/profileContext'
import {MintterProvider} from 'shared/mintterContext'
import {ToastProvider, DefaultToast} from 'react-toast-notifications'

function Toast(props) {
  console.log('Toast -> props', {props})

  return <DefaultToast {...props} />
}

export function AppProviders({children, ...props}) {
  return (
    <>
      <ReactQueryDevtools initialIsOpen={false} />
      <Router>
        <ThemeProvider>
          <ProfileProvider>
            <MintterProvider>
              <ToastProvider autoDismiss={true} components={{Toast}}>
                {children}
              </ToastProvider>
            </MintterProvider>
          </ProfileProvider>
        </ThemeProvider>
      </Router>
    </>
  )
}
