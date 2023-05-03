import {useEffect} from 'react'
import {
  emit as tauriSend,
  Event,
  EventCallback,
  listen as tauriListen,
} from '@tauri-apps/api/event'
import {invoke as tauriInvoke} from '@tauri-apps/api/tauri'
import {appWindow} from '@tauri-apps/api/window'

export const listen = tauriListen
export const send = tauriSend
export const invoke = tauriInvoke
export const windowListen = appWindow.listen
export const windowSend = appWindow.emit

export function useListen<T = unknown>(
  cmd: string,
  handler: EventCallback<T>,
  deps: React.DependencyList = [],
) {
  useEffect(() => {
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
) {
  useEffect(() => {
    let isSubscribed = true
    let unlisten: () => void

    windowListen(cmd, (event: Event<T>) => {
      if (!isSubscribed) {
        return unlisten()
      }

      handler(event)
    }).then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })
}
