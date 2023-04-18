import {createContext, useContext} from 'react'

type HighlightContextValue = {
  highlightedId: string | null
}
const HighlightContext = createContext<HighlightContextValue | null>(null)

export function HighlightProvider({children}: {children: React.ReactNode}) {
  let blockRef: string | null = null
  if (global?.window?.location?.hash) {
    blockRef = window.location.hash.slice(1)
  }
  return (
    <HighlightContext.Provider value={{highlightedId: blockRef}}>
      {children}
    </HighlightContext.Provider>
  )
}

export function useHighlightContext() {
  const ctx = useContext(HighlightContext)
  if (!ctx)
    throw new Error(
      'useHighlightContext must be used within a HighlightProvider',
    )
  return ctx
}
