import { createFilesMachine } from '@app/files-machine'
import { getRefFromParams, useParams } from '@app/main-page-context'
import { useMemo } from 'react'
import { InterpreterFrom } from 'xstate'
import { createInterpreterContext } from './utils/machine-utils'

const [FilesProvider, useFilesService, createFilesSelector] =
  createInterpreterContext<
    InterpreterFrom<ReturnType<typeof createFilesMachine>>
  >('Files')

export { FilesProvider, useFilesService }

export function usePublicationList() {
  return createFilesSelector((state) => {
    return state.context.publicationList
  })()
}

export function useDraftList() {
  return createFilesSelector((state) => state.context.draftList)()
}

export function usePublicationRef(params?: ReturnType<typeof useParams>) {
  let hookParams = useParams()
  params ||= hookParams
  let pubList = usePublicationList()
  let paramsRef = getRefFromParams('pub', params.docId, params.version)

  let actor = useMemo(
    function publicationRefMemo() {
      let actor = pubList.find((pub) => pub.ref.id == paramsRef)?.ref
      console.log('actor: ', actor, pubList)

      actor?.send('LOAD')

      return actor
    },
    [params, paramsRef],
  )
  return actor
}
