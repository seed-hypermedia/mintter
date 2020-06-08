import {ReactQueryDevtools} from 'react-query-devtools'
// import {AnimatePresence} from 'framer-motion'
import {BrowserRouter as Router} from 'react-router-dom'
import {ThemeProvider} from 'shared/themeContext'
import {ProfileProvider} from 'shared/profileContext'
import {MintterProvider} from 'shared/mintterContext'

export function AppProviders({children, ...props}) {
  console.log('app providers rendered')
  return (
    <>
      <ReactQueryDevtools initialIsOpen={false} />
      <Router>
        <ThemeProvider>
          <ProfileProvider>
            <MintterProvider>{children}</MintterProvider>
          </ProfileProvider>
        </ThemeProvider>
      </Router>
    </>
  )
}
