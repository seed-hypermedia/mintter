import {ReactQueryDevtools} from 'react-query-devtools'
import {BrowserRouter as Router} from 'react-router-dom'
import {ThemeProvider} from 'shared/themeContext'
import {ProfileProvider} from 'shared/profileContext'
import {MintterProvider} from 'shared/mintterContext'
import {ToastProvider, DefaultToast} from 'react-toast-notifications'
import {SidePanelProvider} from './sidePanel'
import {BlockMenuProvider} from '@mintter/editor'

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
    </>
  )
}
