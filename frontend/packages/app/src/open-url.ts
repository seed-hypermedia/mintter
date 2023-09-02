import {useAppContext} from '@mintter/app/src/app-context'
import {NavRoute, useNavigate} from '@mintter/app/src/utils/navigation'
import {getIdsfromUrl, HYPERMEDIA_DOCUMENT_PREFIX} from '@mintter/shared'
import {useMemo} from 'react'

export function useOpenUrl() {
  const {externalOpen} = useAppContext()
  const spawn = useNavigate('spawn')
  const push = useNavigate('push')
  return useMemo(() => {
    return (url?: string, newWindow?: boolean) => {
      if (!url) return

      if (url.startsWith(HYPERMEDIA_DOCUMENT_PREFIX)) {
        const hmIds = getIdsfromUrl(url)
        if (!hmIds[0]) {
          throw new Error('Cannot parse Hyperdocs URL without document ID')
        }
        const pubRoute: NavRoute = {
          key: 'publication',
          documentId: hmIds[0],
          versionId: hmIds[1],
          blockId: hmIds[2],
        }
        if (newWindow) {
          spawn(pubRoute)
        } else {
          push(pubRoute)
        }
        return
      } else {
        externalOpen(url)
      }
    }
  }, [])
}
