import {useInfiniteQuery} from '@tanstack/react-query'
import {useGRPCClient} from '../app-context'
import {queryKeys} from './query-keys'

// async function delay(ms: number) {
//   return new Promise((resolve) => setTimeout(resolve, ms))
// }

export function useFeed(trustedOnly: boolean = false) {
  const grpcClient = useGRPCClient()
  return useInfiniteQuery({
    queryKey: [queryKeys.FEED, trustedOnly],
    queryFn: async (context) => {
      // await delay(2000)
      return await grpcClient.activityFeed.listEvents({
        pageSize: 4,
        pageToken: context.pageParam,
        trustedOnly,
      })
    },
    getNextPageParam: (lastPage) => {
      return lastPage.nextPageToken || undefined
    },
  })
}
