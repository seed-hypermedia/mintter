import {StrictMode} from 'react'
import {hydrate} from 'react-dom'
import {ReactQueryDevtools} from 'react-query/devtools'
import {App} from './app'
import {AppProviders} from './app-providers'

hydrate(
  <StrictMode>
    <AppProviders>
      <App />
      <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
    </AppProviders>
  </StrictMode>,
  document.getElementById('root'),
)
