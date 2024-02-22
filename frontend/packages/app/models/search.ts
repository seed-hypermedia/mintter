import {UseQueryOptions, useQuery} from '@tanstack/react-query'
import {useGRPCClient} from '../app-context'
import {queryKeys} from './query-keys'

export function useSearch(query: string, opts: UseQueryOptions) {
  const grpcClient = useGRPCClient()
  return useQuery({
    ...opts,
    queryKey: [queryKeys.SEARCH],
    keepPreviousData: true,
    queryFn: async () => {
      const result = await grpcClient.entities.searchEntities({
        query,
      })
      return result.entities
    },
  })
}
