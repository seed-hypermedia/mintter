import '@sentry/electron/preload'
import {contextBridge, ipcRenderer} from 'electron'
import {exposeElectronTRPC} from 'electron-trpc/main'
// import directly from this deep path for shared/utils/stream! Bad things happen if you try to directly import from @shm/shared
import {AppWindowEvent} from '@/utils/window-events'
import {eventStream} from '@shm/shared/src/utils/stream'
// import directly from this deep path for shared/utils/stream! Bad things happen if you try to directly import from @shm/shared

process.once('loaded', async () => {
  exposeElectronTRPC()
})

const [dispatchAppWindow, appWindowEvents] = eventStream<AppWindowEvent>()
contextBridge.exposeInMainWorld('appWindowEvents', appWindowEvents)

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
