import {queryKeys} from '@app/hooks'
import {createPromiseClient} from '@bufbuild/connect-web'
import {Comments, transport} from '@mintter/shared'
import {ListConversationsResponse} from '@mintter/shared/client/.generated/documents/v1alpha/comments_pb'
import {useQuery, UseQueryResult} from '@tanstack/react-query'
import {createContext, PropsWithChildren, useContext, useMemo} from 'react'

export type ConversationsContext =
  | (UseQueryResult<ListConversationsResponse> & {
      documentId?: string
    })
  | null

let conversationsContext = createContext<ConversationsContext>(null)

export function ConversationsProvider({
  children,
  documentId,
}: PropsWithChildren<{documentId?: string}>) {
  let queryResult = useQuery({
    queryFn: () =>
      createPromiseClient(Comments, transport).listConversations({documentId}),
    queryKey: [queryKeys.GET_PUBLICATION_CONVERSATIONS, documentId],
    enabled: !!documentId,
  })
  return (
    <conversationsContext.Provider
      value={{
        ...queryResult,
        documentId,
      }}
    >
      {children}
    </conversationsContext.Provider>
  )
}

export function useConversations() {
  let context = useContext(conversationsContext)

  if (!context) throw Error('no conversation context')

  return context
}

export function useBlockConversations(blockId: string, revision?: string) {
  let context = useConversations()

  return useMemo(() => {
    if (!context?.data?.conversations) return []

    return context.data.conversations.filter((conv) => {
      let filteredSelectors = conv.selectors.filter(
        (sel) => sel.blockId == blockId && sel.blockRevision == revision,
      )

      return filteredSelectors.length
    })
  }, [context])
}
