import {features} from '@app/constants'
import {useDocConversations} from '@app/models/comments'
import {
  Annotation,
  Block,
  BlockNode,
  blockToSlate,
  FlowContent,
  Publication,
} from '@mintter/shared'
import {ListConversationsResponse} from '@mintter/shared/client/.generated/documents/v1alpha/comments_pb'
import {UseQueryResult} from '@tanstack/react-query'
import {listen} from '@tauri-apps/api/event'
import {
  createContext,
  PropsWithChildren,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

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
  highlights: Array<string>
  onHighlightConversations: (value: Array<string>) => void
}

let conversationsContext = createContext<ConversationsContext>({
  conversations: null,
  onConversationsOpen: () => {
    //noop
  },
  documentId: undefined,
  blocks: {},
  clientSelectors: {},
  highlights: [],
  onHighlightConversations: () => {
    //noop
  },
})

export const ConversationsProvider = features.comments
  ? RealConversationsProvider
  : DummyProvider

export function RealConversationsProvider({
  children,
  documentId,
  onConversationsOpen,
  publication,
  isOpen,
}: PropsWithChildren<{
  documentId?: string
  onConversationsOpen: (conversationIds: string[]) => void
  publication: Publication | null
  isOpen: boolean
}>) {
  let queryResult = useDocConversations(documentId)

  let [highlights, setHighlights] = useState<Array<string>>([])

  function onHighlightConversations(value: Array<string>) {
    setHighlights(value)
  }

  let blocksD = useMemo<Record<string, Block>>(() => {
    let res: Record<string, Block> = {}

    if (publication?.document?.children) {
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
      if (!block) return
      let start = selector.start
      let end = selector.end
      if (start === 0 && end === 0) {
        // whole block is selected.
        end = block.text.length
      }
      block.annotations.push(
        new Annotation({
          type: 'conversation',
          starts: [start],
          ends: [end],
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

  useEffect(() => {
    let unlisten: () => void | undefined

    listen<{conversations: Array<string>}>('selector_click', (event) => {
      console.log('CLICK ON SELECTOR!', event)
      setHighlights(event.payload.conversations)
    }).then((f) => (unlisten = f))

    return () => unlisten?.()
  }, [])

  return (
    <conversationsContext.Provider
      value={{
        documentId,
        onConversationsOpen: (conversations: Array<string>) => {
          setHighlights(conversations)
          onConversationsOpen(conversations)
        },
        conversations: queryResult,
        blocks: blocksD,
        clientSelectors,
        highlights: isOpen ? highlights : [],
        onHighlightConversations,
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

function DummyProvider({children}: {children: ReactNode}) {
  return <>{children}</>
}
