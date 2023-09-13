import {useAppContext} from '@mintter/app/src/app-context'
import {NavRoute, useNavigate} from '@mintter/app/src/utils/navigation'
import {UnpackedHypermediaId, createHmId, unpackHmId} from '@mintter/shared'
import {useMemo} from 'react'

export function unpackHmIdWithAppRoute(
  hmId: string,
): (UnpackedHypermediaId & {navRoute?: NavRoute}) | null {
  const hmIds = unpackHmId(hmId)
  if (!hmIds) return null
  let navRoute: NavRoute | undefined = undefined
  if (hmIds?.type === 'd') {
    navRoute = {
      key: 'publication',
      documentId: createHmId('d', hmIds.eid),
      versionId: hmIds.version,
      blockId: hmIds.blockRef,
    }
  } else if (hmIds?.type === 'g') {
    navRoute = {
      key: 'group',
      groupId: createHmId('g', hmIds.eid),
    }
  } else if (hmIds?.type === 'a') {
    navRoute = {
      key: 'account',
      accountId: hmIds.eid,
    }
  }
  return {...hmIds, navRoute}
}

export function useOpenUrl() {
  const {externalOpen} = useAppContext()
  const spawn = useNavigate('spawn')
  const push = useNavigate('push')
  return useMemo(() => {
    return (url?: string, newWindow?: boolean) => {
      if (!url) return
      const dest = unpackHmIdWithAppRoute(url)
      if (dest?.navRoute) {
        if (newWindow) {
          spawn(dest?.navRoute)
        } else {
          push(dest?.navRoute)
        }
        return
      } else {
        externalOpen(url)
      }
    }
  }, [])
}
