import {Document} from '@mintter/shared'
import {ClientPublication} from '@app/publication-machine'
import {createContext, useContext, useMemo} from 'react'

export type FileContext = ClientPublication | Document

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

export function useFileIds():
  | [documentId: string, version: string]
  | [documentId: string] {
  let context = useFile()
  // @ts-ignore
  return useMemo(() => {
    if ('document' in context) {
      return [context.document.id, context.version]
    } else {
      return [context.id]
    }
  }, [context])
}
