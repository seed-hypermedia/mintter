import {AppIPC} from '@mintter/app/src/app-ipc'

export function createIPC(): AppIPC {
  return {
    invoke: async (cmd: string, args?: Record<string, unknown>) => {
      console.log('IPC Invoke', cmd, args)
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
