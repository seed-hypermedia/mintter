import {useAppContext} from '@mintter/app/src/app-context'
import {NavRoute, useNavigate} from '@mintter/app/src/utils/navigation'
import {createHmId, isHypermediaScheme, unpackHmId} from '@mintter/shared'
import {useMemo} from 'react'

export function hmIdToAppRoute(hmId: string): NavRoute | undefined {
  const hmIds = unpackHmId(hmId)

  let pubRoute: NavRoute | undefined = undefined
  if (hmIds?.scheme === 'hm') {
    if (hmIds?.type === 'd') {
      pubRoute = {
        key: 'publication',
        documentId: createHmId('d', hmIds.eid),
        versionId: hmIds.version,
        blockId: hmIds.blockRef,
      }
    } else if (hmIds?.type === 'g') {
      pubRoute = {
        key: 'group',
        groupId: createHmId('g', hmIds.eid),
      }
    } else if (hmIds?.type === 'a') {
      pubRoute = {
        key: 'account',
        accountId: hmIds.eid,
      }
    }
  }
  return pubRoute
}

export function useOpenUrl() {
  const {externalOpen} = useAppContext()
  const spawn = useNavigate('spawn')
  const push = useNavigate('push')
  return useMemo(() => {
    return (url?: string, newWindow?: boolean) => {
      if (!url) return

      const pubRoute = hmIdToAppRoute(url)
      if (pubRoute) {
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
