import {useQuery} from '@tanstack/react-query'
import {queryKeys} from './query-keys'
import {useGRPCClient} from '../app-context'

export function useDocConversations(documentId?: string) {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryFn: async () => {
      let res = await grpcClient.comments.listConversations({
        documentId,
      })
      return res.conversations
    },

    queryKey: [queryKeys.GET_PUBLICATION_CONVERSATIONS, documentId],
    enabled: !!documentId,
  })
}
