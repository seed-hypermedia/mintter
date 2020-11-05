import {ReactQueryDevtools} from 'react-query-devtools'
import {BrowserRouter as Router} from 'react-router-dom'
import {ThemeProvider} from 'shared/themeContext'
import {ProfileProvider} from 'shared/profileContext'
import {MintterProvider} from 'shared/mintterContext'
import {ToastProvider, DefaultToast} from 'react-toast-notifications'
import {InteractionPanelProvider} from './interactionPanel'

function Toast({children, ...props}) {
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
                <InteractionPanelProvider>{children}</InteractionPanelProvider>
              </ToastProvider>
            </MintterProvider>
          </ProfileProvider>
        </ThemeProvider>
      </Router>
    </>
  )
}
