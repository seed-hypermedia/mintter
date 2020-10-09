import React, {createContext, useState, useContext} from 'react'

export const BlockToolsContext = createContext<{
  id: any
  setBlockId: any
}>({id: '', setBlockId: null})

export function BlockToolsProvider({children}) {
  const [id, setBlockId] = useState<string>()

  const value = {
    id,
    setBlockId,
  }

  return (
    <BlockToolsContext.Provider value={value}>
      {children}
    </BlockToolsContext.Provider>
  )
}

export function useBlockTools() {
  const context = useContext(BlockToolsContext)

  if (context === undefined) {
    throw new Error(
      `\`useBlockTools\` must be used within a \`BlockToolsProvider\``,
    )
  }

  return context
}
