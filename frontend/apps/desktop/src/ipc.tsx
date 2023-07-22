import type {
  emit as tauriSend,
  listen as tauriListen,
} from '@tauri-apps/api/event'
import type {invoke as tauriInvoke} from '@tauri-apps/api/tauri'
import type {appWindow} from '@tauri-apps/api/window'
import {AppIPC} from '@mintter/app'

export let _listen: typeof tauriListen | null = null
export let _send: typeof tauriSend | null = null
export let _invoke: typeof tauriInvoke | null = null
let windowListen: typeof appWindow.listen | null = null
let windowSend: typeof appWindow.emit | null = null

export const listen: typeof tauriListen = (cmd, handler) => {
  if (!_listen) {
    console.warn('Calling listen without Tauri event API: ' + cmd)
    return Promise.resolve(() => {})
  }
  return _listen(cmd, handler)
}

export const send: typeof tauriSend = (cmd, data) => {
  if (!_send) {
    throw new Error('send called before send is defined')
  }
  return _send(cmd, data)
}

export const invoke: typeof tauriInvoke = (cmd, data) => {
  if (!_invoke) {
    throw new Error('invoke called before invoke is defined')
  }
  return _invoke(cmd, data)
}

// @ts-expect-error
if (window?.__TAURI_IPC__) {
  import('@tauri-apps/api/event').then((_tauriEvent) => {
    _listen = _tauriEvent.listen
    _send = _tauriEvent.emit
  })
  import('@tauri-apps/api/tauri').then((_tauri) => {
    _invoke = _tauri.invoke
  })
  import('@tauri-apps/api/window').then((_tauriWindow) => {
    windowListen = _tauriWindow.appWindow.listen
    windowSend = _tauriWindow.appWindow.emit
  })
}

export function createIPC(): AppIPC {
  return {
    invoke: async (cmd: string, args?: Record<string, unknown>) => {},
    send: async (cmd, data) => {
      send(cmd, data)
    },
    listen: (cmd: string, handler: (event: any) => void) => {
      return listen(cmd, handler)
    },
  }
}
