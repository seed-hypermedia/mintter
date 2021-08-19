import {StrictMode} from 'react'
import {render} from 'react-dom'
import {ReactQueryDevtools} from 'react-query/devtools'
import {BrowserRouter as Router} from 'react-router-dom'
import {AppProviders} from './app-providers'
import {App} from './app'
// import {inspect} from '@xstate/inspect'

// inspect({
//   iframe: false, // open in new window
// })

export function Root() {
  return (
    <AppProviders>
      <Router>
        <App />
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </AppProviders>
  )
}

render(
  <StrictMode>
    <Root />
  </StrictMode>,
  document.getElementById('root'),
)
