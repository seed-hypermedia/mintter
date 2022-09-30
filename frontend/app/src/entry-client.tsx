import {onUpdaterEvent} from '@tauri-apps/api/updater'
import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {attachConsole, debug} from 'tauri-plugin-log-api'

import {Root, RootProvider} from './root'

const container = document.getElementById('root')
if (!container) throw new Error('No `root` html element')
const root = createRoot(container)

attachConsole()

onUpdaterEvent(({error, status}) => {
  debug(`Updater event. error: ${error} status: ${status}`)
})

root.render(
  <StrictMode>
    <RootProvider>
      <Root />
    </RootProvider>
  </StrictMode>,
)
