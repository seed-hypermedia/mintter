import {createContext, useContext} from 'react'

type FileContext = {
  type: 'pub' | 'draft'
  documentId: string
  version?: string
}

const fileContext = createContext<FileContext | null>(null)

export const FileProvider = fileContext.Provider

export function useFile() {
  let context = useContext(fileContext)

  if (!context) {
    throw new Error(
      `useFile Error: useFile must be called inside a FilesProvider`,
    )
  }

  return context
}
