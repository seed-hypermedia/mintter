import {StrictMode} from 'react'
import {hydrate} from 'react-dom'
import {ReactQueryDevtools} from 'react-query/devtools'
import {BrowserRouter as Router} from 'react-router-dom'
import {App} from './app'
import {AppProviders} from './app-providers'

hydrate(
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
