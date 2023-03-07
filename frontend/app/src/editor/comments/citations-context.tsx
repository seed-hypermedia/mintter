import {useDocCitations} from '@app/hooks'
import {listCitations} from '@mintter/shared'
import {useQuery, UseQueryResult} from '@tanstack/react-query'
import {createContext, ReactNode, useContext, useMemo} from 'react'

export type CitationsContext = ReturnType<typeof useDocCitations>

let citationsContext = createContext<CitationsContext>({} as any)

export function CitationsProvider({
  children,
  documentId,
}: {
  children: ReactNode
  documentId: string
}) {
  let queryResult = useDocCitations(documentId)

  return (
    <citationsContext.Provider value={queryResult}>
      {children}
    </citationsContext.Provider>
  )
}

export function useCitationsForBlock(blockId: string) {
  let context = useContext(citationsContext)

  return useMemo(() => {
    if (!context) return []

    console.log(
      '🚀 ~ file: citations-context.tsx:33 ~ returnuseMemo ~ context.data?.links:',
      context.data,
    )

    return context.data?.links.filter((link) => {
      return link.target?.blockId == blockId
    })
  }, [blockId])
}
