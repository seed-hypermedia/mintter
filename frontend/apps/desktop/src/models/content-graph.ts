import {useQuery} from '@tanstack/react-query'
import {contentGraphClient} from '../api-clients'
import {queryKeys} from './query-keys'

export type CitationLink = Awaited<
  ReturnType<typeof contentGraphClient.listCitations>
>['links'][number]

export function useDocCitations(docId?: string) {
  return useQuery({
    queryFn: () => contentGraphClient.listCitations({documentId: docId}),
    queryKey: [queryKeys.PUBLICATION_CITATIONS, docId],
    enabled: !!docId,
  })
}
