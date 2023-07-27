import {AppIPC} from '@mintter/app/src/app-ipc'

import {client} from './trpc'
import {decodeRouteFromPath} from '@mintter/app/src/utils/route-encoding'
// import {ipcRenderer} from 'electron/renderer'
console.log('load ipc.ts')
export function createIPC(): AppIPC {
  return {
    invoke: async (cmd: string, args?: Record<string, unknown>) => {
      console.log('IPC INVOKE', cmd, args)
      if (cmd === 'plugin:window|open') {
        const path = (args?.path as string) || ''
        const route = decodeRouteFromPath(path.slice(1))
        await client.createAppWindow.mutate({
          route,
        })
      } else {
        console.log('IPC Invoke', cmd, args)
      }
    },
    ...window.ipc,
  }
}
