import {GRPCClient, unpackHmId} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {useGRPCClient} from '../app-context'
import {queryKeys} from './query-keys'

export type CitationLink = Awaited<
  ReturnType<GRPCClient['contentGraph']['listCitations']>
>['links'][number]

export function useEntityCitations(entityId?: string) {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryFn: () => {
      const id = entityId != null ? unpackHmId(entityId) : null
      if (id?.type === 'd') {
        return grpcClient.contentGraph.listCitations({documentId: entityId})
      }
      // grpcClient.contentGraph.listCitations({documentId: entityId}), // TODO: replace with new API
      return {links: [] as CitationLink[]}
    },
    queryKey: [queryKeys.ENTITY_CITATIONS, entityId],
    enabled: !!entityId,
  })
}
