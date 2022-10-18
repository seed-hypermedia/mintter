import {BrowserTracing} from '@sentry/tracing'
import {onUpdaterEvent} from '@tauri-apps/api/updater'
import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {attachConsole, debug} from 'tauri-plugin-log-api'
import * as TauriSentry from 'tauri-plugin-sentry-api'
import {Root} from './root'

TauriSentry.init({
  integrations: [new BrowserTracing()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
})

var container = document.getElementById('root')
if (!container) throw new Error('No `root` html element')
var root = createRoot(container)

attachConsole()

onUpdaterEvent(({error, status}) => {
  debug(`Updater event. error: ${error} status: ${status}`)
})

root.render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
