import {queryKeys} from '@app/hooks'
import {createPromiseClient} from '@bufbuild/connect-web'
import {Comments, transport} from '@mintter/shared'
import {ListConversationsResponse} from '@mintter/shared/client/.generated/documents/v1alpha/comments_pb'
import {useQuery} from '@tanstack/react-query'
import {createContext, PropsWithChildren, useContext, useMemo} from 'react'

let conversationsContext = createContext<ListConversationsResponse | null>(null)

export function ConversationsProvider({
  children,
  documentId,
}: PropsWithChildren<{documentId?: string}>) {
  let {data = null} = useQuery({
    queryFn: () =>
      createPromiseClient(Comments, transport).listConversations({documentId}),
    queryKey: [queryKeys.GET_PUBLICATION_CONVERSATIONS],
    enabled: !!documentId,
  })
  return (
    <conversationsContext.Provider value={data}>
      {children}
    </conversationsContext.Provider>
  )
}

export function useConversations() {
  let context = useContext(conversationsContext)

  // if (!context) throw Error('no conversation context')

  if (context) {
    return context.conversations
  }

  return []
}

export function useBlockConversations(blockId: string) {
  let conversations = useConversations()

  return useMemo(() => {
    if (!conversations) return []

    return conversations.filter((conv) => {
      let filteredSelectors = conv.selectors.filter(
        (sel) => sel.blockId == blockId,
      )

      return filteredSelectors.length
    })
  }, [conversations])
}
