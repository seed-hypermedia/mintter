import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {ReactQueryDevtools} from 'react-query/devtools'
import {attachConsole} from 'tauri-plugin-log-api'
import {App} from './app'
import {AppProviders} from './app-providers'

var container = document.getElementById('root')
var root = createRoot(container!)

attachConsole()

root.render(
  <StrictMode>
    <AppProviders>
      <App />
      <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
    </AppProviders>
  </StrictMode>,
)
