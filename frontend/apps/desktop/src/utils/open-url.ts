import {getIdsfromUrl, HYPERDOCS_LINK_PREFIX} from '@mintter/shared'
import {open} from '@tauri-apps/api/shell'
import {dispatchAppNavigation, NavRoute, openRouteWindow} from './navigation'

export function openUrl(url?: string, newWindow?: boolean) {
  if (!url) return

  if (url.startsWith(HYPERDOCS_LINK_PREFIX)) {
    const hdIds = getIdsfromUrl(url)
    if (!hdIds[0]) {
      throw new Error('Cannot parse Hyperdocs URL without document ID')
    }
    const pubRoute: NavRoute = {
      key: 'publication',
      documentId: hdIds[0],
      versionId: hdIds[1],
      blockId: hdIds[2],
    }
    if (newWindow) {
      openRouteWindow(pubRoute)
    } else {
      dispatchAppNavigation({
        type: 'push',
        route: pubRoute,
      })
    }
    return
  } else {
    open(url)
  }
}
