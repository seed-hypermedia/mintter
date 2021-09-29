import {StrictMode} from 'react'
import {render} from 'react-dom'
import {ReactQueryDevtools} from 'react-query/devtools'
import {BrowserRouter as Router} from 'react-router-dom'
import {attachConsole} from 'tauri-plugin-log-api'
import {App} from './app'
import {AppProviders} from './app-providers'

attachConsole()

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
