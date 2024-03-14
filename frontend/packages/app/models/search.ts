import {Entity} from '@mintter/shared/src/client/.generated/entities/v1alpha/entities_pb'
import {UseQueryOptions, useQuery} from '@tanstack/react-query'
import {useGRPCClient} from '../app-context'
import {queryKeys} from './query-keys'

export function useSearch(query: string, opts: UseQueryOptions<Entity[]>) {
  const grpcClient = useGRPCClient()
  return useQuery({
    ...opts,
    queryKey: [queryKeys.SEARCH, query],
    keepPreviousData: true,
    enabled: !!query,
    queryFn: async () => {
      const result = await grpcClient.entities.searchEntities({
        query,
      })
      const entities = result.entities.filter((entity) => {
        return entity.title !== '(HIDDEN) Group Navigation'
      })
      return entities
    },
  })
}
