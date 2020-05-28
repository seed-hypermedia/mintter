import {ListPublicationsRequest} from '@mintter/proto/documents_pb'
import {usePaginatedQuery} from 'react-query'
import {makeRpcDocumentsClient} from './rpc'

const rpc = makeRpcDocumentsClient()

export function usePublicationsList(page = 0) {
  return usePaginatedQuery(['PublicationsList', page], async (key, page) => {
    const req = new ListPublicationsRequest()
    req.setPageSize(page)
    return await rpc.listPublications(req)
  })
}
