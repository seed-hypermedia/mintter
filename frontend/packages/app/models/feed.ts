import {useQuery} from '@tanstack/react-query'
import {useGRPCClient} from '../app-context'
import {queryKeys} from './query-keys'

export function useFeed(trustedOnly: boolean = false) {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.FEED, trustedOnly],
    queryFn: async () => {
      return await grpcClient.activityFeed.listEvents({
        pageSize: 100,
        pageToken: '',
        trustedOnly,
      })
    },
  })
}
