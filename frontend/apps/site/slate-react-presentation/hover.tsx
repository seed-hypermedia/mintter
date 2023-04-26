import {createContext, useContext, useState} from 'react'

type HoverContextValue = {
  hoveredId: string | null
  setHoverId: (id: string | null) => void
}
const HoverContext = createContext<HoverContextValue | null>(null)

export function HoverProvider({children}: {children: React.ReactNode}) {
  let [hoveredId, setHoverId] = useState<string | null>(null)

  return (
    <HoverContext.Provider value={{hoveredId, setHoverId}}>
      {children}
    </HoverContext.Provider>
  )
}

export function useHoverContext() {
  const ctx = useContext(HoverContext)
  if (!ctx)
    throw new Error('useHoverContext must be used within a HoverProvider')
  return ctx
}
