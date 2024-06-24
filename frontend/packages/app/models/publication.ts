import {toPlainMessage} from '@bufbuild/protobuf'
import {useQuery} from '@tanstack/react-query'
import {useGRPCClient} from '../app-context'
import {queryKeys} from './query-keys'

export function useDocumentDrafts(docId: string | undefined) {
  const grpcClient = useGRPCClient()
  const drafts = useQuery({
    queryKey: [queryKeys.DOCUMENT_DRAFTS, docId],
    enabled: !!docId,
    queryFn: async () => {
      const result = await grpcClient.drafts.listDocumentDrafts({
        documentId: docId,
      })
      const drafts = (
        await Promise.all(
          result.drafts.map((draft) =>
            grpcClient.drafts.getDraft({draftId: draft.id}),
          ),
        )
      ).map(toPlainMessage)
      return drafts
    },
  })
  return drafts
}

export function usePublicationVariant() {
  throw new Error('not implemented right now')
}
