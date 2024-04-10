import {
  Entity,
  SearchEntitiesResponse,
} from '@mintter/shared/src/client/.generated/entities/v1alpha/entities_pb'
import {UseQueryOptions, useQuery} from '@tanstack/react-query'
import {useMemo} from 'react'
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

export function useSearchMentionsV2(
  query: string,
  opts: UseQueryOptions<SearchEntitiesResponse>,
) {
  const grpcClient = useGRPCClient()
  const searchQuery = useQuery({
    queryKey: [queryKeys.SEARCH_MENTIONS, query],
    keepPreviousData: true,
    enabled: !!query,
    queryFn: () =>
      grpcClient.entities.searchEntities({
        query,
      }),
    ...opts,
  })

  let emptyRespose = {accounts: [], groups: [], documents: []}

  return useMemo(() => {
    if (!searchQuery.data?.entities.length) return emptyRespose
    return searchQuery.data?.entities.reduce((acc: GroupResults, entity) => {
      if (entity.id.startsWith('hm://a/')) {
        acc.accounts.push(entity)
      } else if (entity.id.startsWith('hm://g/')) {
        acc.groups.push(entity)
      } else if (entity.id.startsWith('hm://d/')) {
        acc.documents.push(entity)
      }
      return acc
    }, emptyRespose)
  }, [searchQuery.data, searchQuery.status])
}

type GroupResults = {
  accounts: Array<Entity>
  groups: Array<Entity>
  documents: Array<Entity>
}

export function useSearchMentions(
  query: string,
  opts: UseQueryOptions<SearchEntitiesResponse>,
) {
  const grpcClient = useGRPCClient()
  const searchQuery = useQuery({
    queryKey: [queryKeys.SEARCH_MENTIONS, query],
    keepPreviousData: true,
    enabled: !!query,
    queryFn: () =>
      grpcClient.entities.searchEntities({
        query,
      }),
    ...opts,
  })

  return useMemo(() => {
    if (!searchQuery.data?.entities.length) return []
    let sorted = searchQuery.data?.entities.sort((a, b) => {
      const prefixOrder = {'hm://a/': 0, 'hm://g/': 1, 'hm://d/': 2}
      const prefixA = a.id.substring(0, 7) // Extract the prefix of id
      const prefixB = b.id.substring(0, 7)

      // Compare prefixes based on their order in prefixOrder object
      return prefixOrder[prefixA] - prefixOrder[prefixB]
    })
    return sorted
  }, [searchQuery.data, searchQuery.status])
}
