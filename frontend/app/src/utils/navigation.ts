import {createDraft} from '@mintter/shared'
import {invoke as tauriInvoke} from '@tauri-apps/api'
import {toast} from 'react-hot-toast'
import {openWindow} from './open-window'

export function openNewDraft() {
  createDraft()
    .then((doc) => {
      let path = `/d/${doc.id}/new`
      tauriInvoke('emit_all', {
        event: 'new_draft',
      })
      openWindow(path)
    })
    .catch(() => {
      toast.error('Failed to create new draft')
    })
}

export function openPublication(
  docId: string,
  version?: string,
  blockId?: string,
) {
  let path = `/p/${docId}`
  if (version) {
    path += `/${version}`
    if (blockId) {
      path += `/${blockId}`
    }
  }
  openWindow(path)
}

export function openDraft(draftId: string) {
  let path = `/d/${draftId}`
  openWindow(path)
}
