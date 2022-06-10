import {createFilesMachine} from '@app/files-machine'
import {InterpreterFrom} from 'xstate'
import {createInterpreterContext} from './utils/machine-utils'

const [FilesProvider, useFilesService, createFilesSelector] =
  createInterpreterContext<
    InterpreterFrom<ReturnType<typeof createFilesMachine>>
  >('Files')

export {FilesProvider, useFilesService}

export function usePublicationList() {
  return createFilesSelector((state) => {
    return state.context.publicationList
  })()
}

export function useDraftList() {
  return createFilesSelector((state) => state.context.draftList)()
}
