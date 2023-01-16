import {createDraft} from '@mintter/client'
import {invoke as tauriInvoke} from '@tauri-apps/api'

export function openWindow(path?: string) {
  if (path) {
    // Open window with path
    tauriInvoke('plugin:window|open', {path})
  } else {
    createDraft().then((doc) => {
      let path = `/d/${doc.id}`
      // open window with new path
      tauriInvoke('emit_all', {
        event: 'new_draft',
      })
      tauriInvoke('plugin:window|open', {path})
    })
  }
}
