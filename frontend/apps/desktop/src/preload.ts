import {NavState} from '@mintter/app/src/utils/navigation'
import {contextBridge, ipcRenderer} from 'electron'
import {exposeElectronTRPC} from 'electron-trpc/main'
import type {GoDaemonState} from './api'
import {eventStream, writeableStateStream} from './stream'
import {AppWindowEvent} from '@mintter/app/src/utils/window-events'

process.once('loaded', async () => {
  exposeElectronTRPC()
})

const [updateDaemonState, daemonState] =
  writeableStateStream<GoDaemonState | null>(null)

const [updateInitNavState, initNavState] =
  writeableStateStream<NavState | null>(null)

const [dispatchAppWindow, appWindowEvents] = eventStream<AppWindowEvent>()

contextBridge.exposeInMainWorld('daemonState', daemonState)
contextBridge.exposeInMainWorld('initNavState', initNavState)
contextBridge.exposeInMainWorld('appWindowEvents', appWindowEvents)
contextBridge.exposeInMainWorld('appInfo', {
  platform: () => process.platform,
  arch: () => process.arch,
})

//@ts-expect-error
ipcRenderer.addListener('initWindow', (info, event) => {
  console.log('💡 Init Window', event)
  updateInitNavState({
    routes: event.routes,
    routeIndex: event.routeIndex,
    lastAction: 'replace',
  })
  updateDaemonState(event.daemonState)
})

const routeHandlers = new Set<(route: any) => void>()

contextBridge.exposeInMainWorld('routeHandlers', routeHandlers)

ipcRenderer.addListener('openRoute', (info, route) => {
  routeHandlers.forEach((handler) => handler(route))
})

ipcRenderer.addListener('goDaemonState', (info, state) => {
  updateDaemonState(state)
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
