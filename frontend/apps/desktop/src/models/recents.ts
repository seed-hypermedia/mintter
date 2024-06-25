import {trpc} from '@/trpc'
import {useQueryInvalidator} from '../app-context'
import {useNavRoute} from '../utils/navigation'
import {getRecentsRouteEntityUrl} from '../utils/routes'

export function useRecents() {
  const route = useNavRoute()
  const currentRouteUrl = getRecentsRouteEntityUrl(route)
  const recentsQuery = trpc.recents.getRecents.useQuery()
  return {
    ...recentsQuery,
    data: recentsQuery.data?.filter((item) => {
      return item.url !== currentRouteUrl
    }),
  }
}

export function useDeleteRecent() {
  const invalidate = useQueryInvalidator()
  return trpc.recents.deleteRecent.useMutation({
    onSuccess: () => {
      invalidate(['trpc.recents.getRecents'])
    },
  })
}
