import {StrictMode} from 'react'
import {render} from 'react-dom'
import {ReactQueryDevtools} from 'react-query/devtools'
import {BrowserRouter as Router} from 'react-router-dom'
import {AppProviders} from './app-providers'
import {App} from './app'

render(
  <StrictMode>
    <AppProviders>
      <Router>
        <App />
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </AppProviders>
  </StrictMode>,
  document.getElementById('root'),
)
