import {GRPCClient} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {useGRPCClient} from '../app-context'
import {queryKeys} from './query-keys'

export type CitationLink = Awaited<
  ReturnType<GRPCClient['contentGraph']['listCitations']>
>['links'][number]

export function useDocCitations(docId?: string) {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryFn: () => grpcClient.contentGraph.listCitations({documentId: docId}),
    queryKey: [queryKeys.PUBLICATION_CITATIONS, docId],
    enabled: !!docId,
  })
}
