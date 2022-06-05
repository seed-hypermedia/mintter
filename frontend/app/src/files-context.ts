import { createFilesMachine } from '@app/files-machine'
import { getRefFromParams, useParams } from '@app/main-page-context'
import { debug } from '@app/utils/logger'
import { useMemo } from 'react'
import { InterpreterFrom } from 'xstate'
import { createInterpreterContext } from './utils/machine-utils'

const [FilesProvider, useFilesService, createFilesSelector] =
  createInterpreterContext<
    InterpreterFrom<ReturnType<typeof createFilesMachine>>
  >('Files')

export { FilesProvider, useFilesService }

export function usePublicationList() {
  debug('HELLO PUB LIST')
  return createFilesSelector((state) => state.context.publicationList)()
}

export function useDraftList() {
  return createFilesSelector((state) => state.context.draftList)()
}

export function usePublicationRef(
  params = useParams(),
) {
  let pubList = usePublicationList()
  let paramsRef = getRefFromParams('pub', params.docId, params.version)

  let actor = useMemo(
    function publicationRefMemo() {
      let actor = pubList.find((pub) => pub.ref.id == paramsRef)?.ref
      actor?.send('LOAD')

      return actor
    },
    [params, paramsRef],
  )
  return actor
}
