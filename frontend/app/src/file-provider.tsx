import {DraftRef, PublicationRef} from '@app/main-machine'
import {createContext, useContext} from 'react'

type FileContext = PublicationRef | DraftRef

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
