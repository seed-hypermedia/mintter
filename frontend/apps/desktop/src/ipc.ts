import {AppIPC} from '@mintter/app/app-ipc'

import {client} from './trpc'
import {decodeRouteFromPath} from '@mintter/app/utils/route-encoding'

export function createIPC(): AppIPC {
  return {
    invoke: async (cmd: string, args?: Record<string, unknown>) => {
      console.debug('IPC INVOKE', cmd, args)
      if (cmd === 'plugin:window|open') {
        const path = (args?.path as string) || ''
        const route = decodeRouteFromPath(path.slice(1))
        await client.createAppWindow.mutate({
          route,
        })
      } else {
        console.debug('IPC Invoke', cmd, args)
      }
    },
    ...window.ipc,
  }
}
