import {useEntityMentions} from '@/models/content-graph'
import {Mention} from '@shm/shared/src/client/.generated/entities/v1alpha/entities_pb'
import {createContext, ReactNode, useContext, useMemo, useState} from 'react'

export type CitationsContext = {
  citations: Mention[] | undefined
  onCitationsOpen: (mentions: Array<Mention>) => void
  highlights: Array<Mention>
  onHighlightCitations: (mentions: Array<Mention>) => void
}

let citationsContext = createContext<CitationsContext>({
  citations: null,
  onCitationsOpen: () => {
    //noop
  },
  highlights: [],
} as any)

export function CitationsProvider({
  children,
  documentId,
  onCitationsOpen,
}: {
  children: ReactNode
  documentId: string
  onCitationsOpen: (citations: Array<Mention>) => void
}) {
  let queryResult = useEntityMentions(documentId)

  let [highlights, setHighlights] = useState<Array<Mention>>([])

  function onHighlightCitations(value: Array<Mention>) {
    setHighlights(value)
  }

  return (
    <citationsContext.Provider
      value={{
        citations: queryResult.data?.mentions,
        highlights,
        onCitationsOpen: (citations: Array<Mention>) => {
          onCitationsOpen(citations)
          setHighlights(citations)
        },
        onHighlightCitations,
      }}
    >
      {children}
    </citationsContext.Provider>
  )
}

export function useCitations() {
  return useContext(citationsContext)
}

export function useCitationsForBlock(blockId: string) {
  let context = useContext(citationsContext)
  let citations = useMemo(() => {
    if (!context) return []
    return context.citations?.filter((link) => {
      return link.targetFragment == blockId
    })
  }, [blockId, context])

  return {
    citations,
    onCitationsOpen: context.onCitationsOpen,
  }
}
