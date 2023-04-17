import {commentsClient} from '@app/api-clients'
import {useQuery} from '@tanstack/react-query'
import {queryKeys} from './query-keys'

export function useDocConversations(documentId?: string) {
  return useQuery({
    queryFn: async () => {
      let res = await commentsClient.listConversations({
        documentId,
      })
      return res.conversations
    },

    queryKey: [queryKeys.GET_PUBLICATION_CONVERSATIONS, documentId],
    enabled: !!documentId,
  })
}
