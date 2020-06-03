import {ReactQueryDevtools} from 'react-query-devtools'
import {AnimatePresence} from 'framer-motion'
import {ThemeProvider} from 'shared/themeContext'
import {ProfileProvider} from 'shared/profileContext'
import {MintterProvider} from 'shared/mintterContext'

export function AppProviders({children, ...props}) {
  return (
    <>
      <ReactQueryDevtools initialIsOpen={false} />
      <ThemeProvider>
        <ProfileProvider>
          <MintterProvider>
            <AnimatePresence exitBeforeEnter>{children}</AnimatePresence>
          </MintterProvider>
        </ProfileProvider>
      </ThemeProvider>
    </>
  )
}
