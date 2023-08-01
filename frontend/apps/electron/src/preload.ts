import {exposeElectronTRPC} from 'electron-trpc/main'
import {contextBridge, ipcRenderer} from 'electron'

process.once('loaded', async () => {
  exposeElectronTRPC()
})

ipcRenderer.addListener('initWindow', (info, event) => {
  // const {route, windowId} = event
  console.log('INIT WINDOW', event)
  contextBridge.exposeInMainWorld('windowInfo', event)
})

const routeHandlers = new Set<(route: any) => void>()

contextBridge.exposeInMainWorld('routeHandlers', routeHandlers)

ipcRenderer.addListener('openRoute', (info, route) => {
  console.log('openRoute', route)
  routeHandlers.forEach((handler) => handler(route))
})

contextBridge.exposeInMainWorld('ipc', {
  send: (cmd, args) => {
    console.log('IPC SENDING', cmd, args)
    ipcRenderer.send(cmd, args)
  },
  listen: async (cmd: string, handler: (event: any) => void) => {
    const innerHandler = (info, payload: any) => {
      console.log('IPC payload received', cmd, payload)
      handler({info, payload})
    }
    console.log('listening!', cmd)
    ipcRenderer.addListener(cmd, innerHandler)
    return () => {
      ipcRenderer.removeListener(cmd, innerHandler)
    }
  },
})
