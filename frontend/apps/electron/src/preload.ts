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

contextBridge.exposeInMainWorld('ipc', {
  send: (cmd, args) => {
    console.log('IPC SENDING', cmd, args)
    ipcRenderer.send(cmd, args)
  },
  listen: async (cmd: string, handler: (event: any) => void) => {
    const innerHandler = (value: any) => {
      console.log('IPC event received', cmd, value)
      handler(value)
    }
    console.log('listening!', cmd)
    ipcRenderer.addListener(cmd, innerHandler)
    return () => {
      ipcRenderer.removeListener(cmd, innerHandler)
    }
  },
})
