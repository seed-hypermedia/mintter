import {
  Entity,
  HYPERMEDIA_ENTITY_TYPES,
  SearchEntitiesResponse,
  unpackHmId,
} from '@shm/shared'
import {UseQueryOptions, useQuery} from '@tanstack/react-query'
import {useCallback, useMemo, useState} from 'react'
import {useGRPCClient} from '../app-context'
import {queryKeys} from './query-keys'
import {useRecents} from './recents'

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

export function useInlineMentions() {
  const recents = useRecents()
  const grpcClient = useGRPCClient()
  const [queryResult, setQueryResult] = useState<any>(null)
  let emptyRespose = {
    Accounts: [],
    Groups: [],
    Documents: [],
    Recents: recents.data,
  }
  const inlineMentionsQuery = useCallback(
    async function searchQuery(query: string) {
      if (!query) {
        return emptyRespose
      }
      let resp = await grpcClient.entities.searchEntities({query})
      setQueryResult(resp.entities)
    },
    [grpcClient],
  )

  const result = useMemo(() => {
    if (!queryResult?.length) return emptyRespose
    return queryResult.reduce((acc: GroupResults, entity) => {
      if (entity.id.startsWith('hm://a/')) {
        acc.Accounts.push({
          title: entity.title,
          value: entity.id,
          subtitle: 'Account',
        })
      } else if (entity.id.startsWith('hm://g/')) {
        acc.Groups.push({
          title: entity.title,
          subtitle: 'Group',
          value: entity.id,
        })
      } else if (entity.id.startsWith('hm://d/')) {
        acc.Documents.push({
          title: entity.title,
          subtitle: 'Document',
          value: entity.id,
        })
      }
      return acc
    }, emptyRespose)
  }, [queryResult])

  return {
    inlineMentionsData: {
      ...result,
      Recents: recents.data,
    },
    inlineMentionsQuery,
  }
}

type InlineMentionsResult = {
  title: string
  subtitle: string
  value: string
}

type GroupResults = {
  Accounts: Array<InlineMentionsResult>
  Groups: Array<InlineMentionsResult>
  Documents: Array<InlineMentionsResult>
}

export function _useSearchMentions(
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

interface SearchItem {
  title: string
  subtitle: string
  value: string
}

export function transformResultsToItems(
  results: Array<Entity>,
): Array<SearchItem> {
  // @ts-expect-error
  return (
    results
      .map((entity) => {
        const id = unpackHmId(entity.id)
        if (!id) return null

        return {
          title: entity.title,
          subtitle: HYPERMEDIA_ENTITY_TYPES[id.type],
          value: entity.id,
        } as SearchItem
      })
      .filter(Boolean) || []
  )
}
