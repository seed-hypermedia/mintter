import {contextBridge, ipcRenderer} from 'electron'
import {exposeElectronTRPC} from 'electron-trpc/main'
import type {GoDaemonState} from './api'
import {eventStream, writeableStateStream} from './stream'
import {AppWindowEvent} from '@mintter/app/utils/window-events'

process.once('loaded', async () => {
  exposeElectronTRPC()
})

// const [updateInitNavState, initNavState] =
//   writeableStateStream<NavState | null>(null)

const [dispatchAppWindow, appWindowEvents] = eventStream<AppWindowEvent>()

contextBridge.exposeInMainWorld('appWindowEvents', appWindowEvents)
contextBridge.exposeInMainWorld('appInfo', {
  platform: () => process.platform,
  arch: () => process.arch,
})

// let windowId: string | null = null
// console.log('---preloooadddd')
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

const windowInfo = ipcRenderer.sendSync('initWindow')

contextBridge.exposeInMainWorld('initNavState', windowInfo.navState)

const [updateDarkMode, darkMode] = writeableStateStream<GoDaemonState>(
  windowInfo.darkMode,
)
contextBridge.exposeInMainWorld('darkMode', darkMode)

const windowId = windowInfo.windowId

const [updateDaemonState, daemonState] = writeableStateStream<GoDaemonState>(
  windowInfo.daemonState,
)
contextBridge.exposeInMainWorld('daemonState', daemonState)

contextBridge.exposeInMainWorld('windowIsReady', () => {
  ipcRenderer.send('windowIsReady')
})
const routeHandlers = new Set<(route: any) => void>()

contextBridge.exposeInMainWorld('routeHandlers', routeHandlers)

ipcRenderer.addListener('openRoute', (info, route) => {
  routeHandlers.forEach((handler) => handler(route))
})

ipcRenderer.addListener('goDaemonState', (info, state) => {
  updateDaemonState(state)
})

ipcRenderer.addListener('darkMode', (info, state) => {
  updateDarkMode(state)
})

ipcRenderer.addListener('appWindowEvent', (info, event) => {
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
