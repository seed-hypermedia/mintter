import {useEffect} from 'react'
import type {
  emit as tauriSend,
  Event,
  EventCallback,
  listen as tauriListen,
} from '@tauri-apps/api/event'
import type {invoke as tauriInvoke} from '@tauri-apps/api/tauri'
import type {appWindow} from '@tauri-apps/api/window'

// export let listen = null
// export let send = null

export let _listen: typeof tauriListen | null = null
export let _send: typeof tauriSend | null = null
export let _invoke: typeof tauriInvoke | null = null
let windowListen: typeof appWindow.listen | null = null
let windowSend: typeof appWindow.emit | null = null
// export let windowListen = null
// export let windowSend = null

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

export function useListen<T = unknown>(
  cmd: string,
  handler: EventCallback<T>,
  deps: React.DependencyList = [],
) {
  useEffect(() => {
    if (!listen) {
      throw new Error('useListen called before listen is defined')
    }
    let isSubscribed = true
    let unlisten: () => void

    listen(cmd, (event: Event<T>) => {
      if (!isSubscribed) {
        return unlisten()
      }

      handler(event)
    }).then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  }, deps)
}

export function useWindowListen<T = unknown>(
  cmd: string,
  handler: EventCallback<T>,
  deps: React.DependencyList = [],
) {
  useEffect(() => {
    let isSubscribed = true
    let unlisten: () => void

    if (!windowListen) {
      throw new Error('useWindowListen called before windowListen is defined')
    }

    windowListen(cmd, (event: Event<T>) => {
      if (!isSubscribed) {
        return unlisten()
      }

      handler(event)
    })
      .then((_unlisten) => (unlisten = _unlisten))
      .catch((err) => {
        console.error(`=== useWindowListen ERROR: ${err}`)
      })

    return () => {
      isSubscribed = false
    }
  }, [...deps, windowListen])
}
