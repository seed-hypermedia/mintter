import {AppIPC} from '@mintter/app'

export function createIPC(): AppIPC {
  return {
    invoke: async (cmd: string, args?: Record<string, unknown>) => {},
    send: async (cmd, data) => {
      // send(cmd, data)
    },
    listen: async (cmd: string, handler: (event: any) => void) => {
      // return listen(cmd, handler)
      return () => {}
    },
  }
}
