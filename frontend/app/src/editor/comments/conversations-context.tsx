import {queryKeys} from '@app/hooks'
import {ClientPublication} from '@app/publication-machine'
import {createPromiseClient} from '@bufbuild/connect-web'
import {
  Annotation,
  Block,
  BlockNode,
  blockToSlate,
  Comments,
  FlowContent,
  transport,
} from '@mintter/shared'
import {ListConversationsResponse} from '@mintter/shared/client/.generated/documents/v1alpha/comments_pb'
import {useQuery, UseQueryResult} from '@tanstack/react-query'
import {createContext, PropsWithChildren, useContext, useMemo} from 'react'

type BlocksDictionary = Record<string, Block>
type SelectorDictionary = Record<string, FlowContent>

export type ConversationsContext = {
  documentId?: string
  conversations: UseQueryResult<
    ListConversationsResponse['conversations']
  > | null
  onConversationsOpen: (conversationIds: string[]) => void
  blocks: BlocksDictionary
  clientSelectors: SelectorDictionary
}

let conversationsContext = createContext<ConversationsContext>({
  conversations: null,
  onConversationsOpen: () => {
    //noop
  },
  documentId: undefined,
  blocks: {},
  clientSelectors: {},
})

export function ConversationsProvider({
  children,
  documentId,
  onConversationsOpen,
  publication,
}: PropsWithChildren<{
  documentId?: string
  onConversationsOpen: (conversationIds: string[]) => void
  publication: ClientPublication | null
}>) {
  let queryResult = useQuery({
    queryFn: async () => {
      let res = await createPromiseClient(
        Comments,
        transport,
      ).listConversations({
        documentId,
      })
      return res.conversations
    },

    queryKey: [queryKeys.GET_PUBLICATION_CONVERSATIONS, documentId],
    enabled: !!documentId,
  })

  let blocksD = useMemo<Record<string, Block>>(() => {
    let res: Record<string, Block> = {}

    if (publication?.document.children) {
      groupLoop(publication.document.children)
    }

    function groupLoop(list: Array<BlockNode>) {
      list.forEach((b) => {
        if (b.block) {
          res[b.block.id] = b.block
        }

        if (b.children.length) {
          groupLoop(b.children)
        }
      })
    }

    return res
  }, [publication])

  let clientSelectors = useMemo(() => {
    let res: SelectorDictionary = {}

    queryResult.data?.forEach((conversation) => {
      let [selector] = conversation.selectors
      let block = blocksD[selector.blockId]
      block.annotations.push(
        new Annotation({
          type: 'conversation',
          starts: [selector.start],
          ends: [selector.end],
          attributes: {
            conversationId: conversation.id,
          },
        }),
      )

      res[block.id] = blockToSlate(block)
    })

    // onSelectorsReady(res)
    return res
  }, [queryResult.data, blocksD])

  return (
    <conversationsContext.Provider
      value={{
        documentId,
        onConversationsOpen,
        conversations: queryResult,
        blocks: blocksD,
        clientSelectors,
      }}
    >
      {children}
    </conversationsContext.Provider>
  )
}

export function useConversations() {
  let context = useContext(conversationsContext)

  // if (!context) throw Error('no conversation context')

  return context
}

export function useBlockConversations(blockId: string, revision?: string) {
  let context = useConversations()

  return useMemo(() => {
    if (!context?.conversations?.data) return []

    return context.conversations.data.filter((conv) => {
      let filteredSelectors = conv.selectors.filter(
        (sel) => sel.blockId == blockId && sel.blockRevision == revision,
      )

      return filteredSelectors.length
    })
  }, [context])
}
