import {ReactQueryDevtools} from 'react-query-devtools'
// import {AnimatePresence} from 'framer-motion'
import {BrowserRouter as Router} from 'react-router-dom'
import {ThemeProvider} from 'shared/themeContext'
import {ProfileProvider} from 'shared/profileContext'
import {MintterProvider} from 'shared/mintterContext'
import {ToastProvider, DefaultToast} from 'react-toast-notifications'
import {DragDropContext} from 'react-beautiful-dnd'
import {onDragEnd, onDragStart} from '@mintter/editor'

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
        <ThemeProvider>
          <ProfileProvider>
            <MintterProvider>
              <ToastProvider autoDismiss={true} components={{Toast}}>
                <DragDropContext
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                >
                  {children}
                </DragDropContext>
              </ToastProvider>
            </MintterProvider>
          </ProfileProvider>
        </ThemeProvider>
      </Router>
    </>
  )
}
