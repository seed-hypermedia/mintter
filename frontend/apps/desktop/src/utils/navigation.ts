import {draftsClient} from '@app/api-clients'
import {invoke as tauriInvoke} from '@tauri-apps/api'
import {toast} from 'react-hot-toast'
import {useLocation} from 'wouter'
import {openWindow} from './open-window'

export function useNavigation() {
  const [, setLocation] = useLocation()
  function openNewDraft(newWindow = true) {
    draftsClient
      .createDraft({})
      .then((doc) => {
        let path = `/d/${doc.id}/new`
        tauriInvoke('emit_all', {
          event: 'new_draft',
        })
        if (newWindow) {
          openWindow(path)
        } else {
          setLocation(path)
        }
      })
      .catch(() => {
        toast.error('Failed to create new draft')
      })
  }
  return {
    openNewDraft,
  }
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
