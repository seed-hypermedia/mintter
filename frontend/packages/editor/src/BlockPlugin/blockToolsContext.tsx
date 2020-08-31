import React, {createContext, useState, useMemo, useContext} from 'react'

export const BlockToolsContext = createContext<{
  id: any
  setBlockId: any
}>({id: '', setBlockId: null})

export function BlockToolsProvider({children}) {
  const [id, setBlockId] = useState<string>()
  console.log('BlockToolsProvider -> id', id)

  const value = useMemo(
    () => ({
      id,
      setBlockId,
    }),
    [id, setBlockId],
  )
  return (
    <BlockToolsContext.Provider value={value}>
      {children}
    </BlockToolsContext.Provider>
  )
}

export function useBlockTools() {
  return useContext(BlockToolsContext)
}
