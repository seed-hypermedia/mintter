import {DraftRef, PublicationRef} from '@app/main-machine'
import {useSelector} from '@xstate/react'
import {createContext, useContext} from 'react'

export type FileContext = PublicationRef | DraftRef

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

export function useFileEditor() {
  let context = useFile()
  return useSelector(context, (state) => state.context.editor)
}

export function useFileIds() {
  let context = useFile()
  return useSelector(context, (state) => [
    state.context.documentId,
    state.context.version,
  ])
}
