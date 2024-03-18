import '@sentry/electron/preload'
import {contextBridge, ipcRenderer} from 'electron'
// import directly from this deep path for shared/utils/stream! Bad things happen if you try to directly import from @mintter/shared
import {AppWindowEvent} from '@mintter/app/utils/window-events'
import {
  eventStream,
  writeableStateStream,
} from '@mintter/shared/src/utils/stream'
import {GoDaemonState} from './daemon'

// const [updateInitNavState, initNavState] =
//   writeableStateStream<NavState | null>(null)

const [dispatchAppWindow, appWindowEvents] = eventStream<AppWindowEvent>()
const windowInfo = ipcRenderer.sendSync('initWindow')

contextBridge.exposeInMainWorld('appWindowEvents', appWindowEvents)

// let windowId: string | null = null
console.log('---preloooadddd')
// ipcRenderer.addListener('initWindow', (info, event) => {
//   console.log('💡 Init Window', event)
//   windowId = event.windowId
//   updateInitNavState({
//     routes: event.routes,
//     routeIndex: event.routeIndex,
//     lastAction: 'replace',
//   })
//   updateDaemonState(event.daemonState)
// })

const [updateDarkMode, darkMode] = writeableStateStream<GoDaemonState>(
  windowInfo.darkMode,
)
contextBridge.exposeInMainWorld('darkMode', darkMode)

ipcRenderer.addListener('darkMode', (info, state) => {
  updateDarkMode(state)
})

ipcRenderer.addListener('appWindowEvent', (info, event) => {
  dispatchAppWindow(event)
})

ipcRenderer.addListener('find_in_page', (info, event) => {
  console.log('== FIND IN PAGE INSIDE PRELOAD')
  dispatchAppWindow(event)
})

contextBridge.exposeInMainWorld('ipc', {
  send: (cmd, args) => {
    ipcRenderer.send(cmd, args)
  },
  listen: async (cmd: string, handler: (event: any) => void) => {
    const innerHandler = (info, payload: any) => {
      handler({info, payload})
    }
    ipcRenderer.addListener(cmd, innerHandler)
    return () => {
      ipcRenderer.removeListener(cmd, innerHandler)
    }
  },
  versions: () => {
    return process.versions
  },
})
