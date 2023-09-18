import {useState} from 'react'
import {useDocCitations} from '@mintter/app/src/models/content-graph'
import {MttLink as Link} from '@mintter/shared'
import {createContext, ReactNode, useContext, useMemo} from 'react'

export type CitationsContext = {
  citations: ReturnType<typeof useDocCitations>
  onCitationsOpen: (citations: Array<Link>) => void
  highlights: Array<Link>
  onHighlightCitations: (citations: Array<Link>) => void
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
  onCitationsOpen: (citations: Array<Link>) => void
}) {
  let queryResult = useDocCitations(documentId)

  let [highlights, setHighlights] = useState<Array<Link>>([])

  function onHighlightCitations(value: Array<Link>) {
    setHighlights(value)
  }

  return (
    <citationsContext.Provider
      value={{
        citations: queryResult,
        highlights,
        onCitationsOpen: (citations: Array<Link>) => {
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
    return context.citations?.data?.links.filter((link) => {
      return link.target?.blockId == blockId
    })
  }, [blockId, context])

  return {
    citations,
    onCitationsOpen: context.onCitationsOpen,
  }
}
