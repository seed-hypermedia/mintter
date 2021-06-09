import {StrictMode} from 'react'
import {render} from 'react-dom'
import {ReactQueryDevtools} from 'react-query/devtools'

import {AppProviders} from './app-providers'
import {App} from './app'

render(
  <StrictMode>
    <AppProviders>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </AppProviders>
  </StrictMode>,
  document.getElementById('root'),
)
