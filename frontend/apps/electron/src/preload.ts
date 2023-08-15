import {exposeElectronTRPC} from 'electron-trpc/main'
import {contextBridge, ipcRenderer} from 'electron'
import type {GoDaemonState} from './api'
import {writeableStateStream} from './stream'

process.once('loaded', async () => {
  exposeElectronTRPC()
})

const [updateDaemonState, daemonState] =
  writeableStateStream<GoDaemonState | null>(null)

const [updateInitRoute, initRoute] = writeableStateStream<string | null>(null)

contextBridge.exposeInMainWorld('daemonState', daemonState)
contextBridge.exposeInMainWorld('initRoute', initRoute)
contextBridge.exposeInMainWorld('appInfo', {
  platform: () => process.platform,
  arch: () => process.arch,
})

ipcRenderer.addListener('initWindow', (info, event) => {
  console.log('💡 Init Window', event)
  updateInitRoute(event.route)
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
})
