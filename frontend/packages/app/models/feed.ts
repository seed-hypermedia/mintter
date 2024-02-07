import {useQuery} from '@tanstack/react-query'
import {useGRPCClient} from '../app-context'
import {queryKeys} from './query-keys'

export function useFeed() {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.FEED],
    queryFn: async () => {
      return await grpcClient.activityFeed.listEvents({
        pageSize: 100,
        pageToken: '',
      })
    },
  })
}
