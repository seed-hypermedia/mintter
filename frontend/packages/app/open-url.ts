import {useAppContext} from '@mintter/app/app-context'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {useMemo} from 'react'
import {toast} from './toast'
import {isHttpUrl, useHmIdToAppRouteResolver} from './utils/navigation'

export function useOpenUrl() {
  const {externalOpen} = useAppContext()
  const resolveRoute = useHmIdToAppRouteResolver()

  const spawn = useNavigate('spawn')
  const push = useNavigate('push')
  return useMemo(() => {
    return (url?: string, newWindow?: boolean) => {
      if (!url) return
      resolveRoute(url).then((resolved) => {
        if (resolved?.navRoute) {
          if (newWindow) {
            spawn(resolved?.navRoute)
          } else {
            push(resolved?.navRoute)
          }
        } else if (isHttpUrl(url)) {
          externalOpen(url)
        } else {
          toast.error(`Failed to resolve route for "${url}"`)
        }
      })
    }
  }, [])
}
