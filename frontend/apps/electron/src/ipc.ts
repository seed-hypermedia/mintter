import {AppIPC} from '@mintter/app/src/app-ipc'

import {client} from './trpc'

export function createIPC(): AppIPC {
  return {
    invoke: async (cmd: string, args?: Record<string, unknown>) => {
      if (cmd === 'plugin:window|open') {
        client.createAppWindow.mutate({})
      } else {
        console.log('IPC Invoke', cmd, args)
      }
    },
    send: async (cmd, data) => {
      console.log('IPC Send', cmd, data)
    },
    listen: async (cmd: string, handler: (event: any) => void) => {
      // return listen(cmd, handler)
      return () => {}
    },
  }
}
