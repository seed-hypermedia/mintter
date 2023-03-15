import {invoke as tauriInvoke} from '@tauri-apps/api'

export function openWindow(path: string) {
  tauriInvoke('plugin:window|open', {path})
}
