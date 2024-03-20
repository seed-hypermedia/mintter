import '@sentry/electron/preload'
import {contextBridge, ipcRenderer} from 'electron'
import {exposeElectronTRPC} from 'electron-trpc/main'
// import directly from this deep path for shared/utils/stream! Bad things happen if you try to directly import from @mintter/shared

process.once('loaded', async () => {
  exposeElectronTRPC()
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
