import {
  ListPublicationsRequest,
  Publication,
  BatchGetSectionsRequest,
} from '@mintter/proto/documents_pb'
import {usePaginatedQuery, QueryResult, useQuery, queryCache} from 'react-query'
import {makeRpcDocumentsClient} from './rpc'

const rpc = makeRpcDocumentsClient()

export async function publicationsListFetcher(key, page) {
  const req = new ListPublicationsRequest()
  req.setPageSize(page)
  return await rpc.listPublications(req)
}

export function usePublicationsList(page = 0) {
  return usePaginatedQuery(['PublicationsList', page], publicationsListFetcher)
}

export function useFetchPublication(id: string | string[]) {
  // : QueryResult<Publication>

  return useQuery(id && ['Publication', id], getPublicationFetcher, {
    refetchOnWindowFocus: false,
  })
}

export async function getPublicationFetcher(key, queryId) {
  if (Array.isArray(queryId)) {
    throw new Error(
      `Impossible render: You are trying to access the editor passing ${
        queryId.length
      } document IDs => ${queryId.map(q => q).join(', ')}`,
    )
  }

  // get document by filtering publication list
  const list = await (await publicationsListFetcher('PublicationsList', 0))
    .getPublicationsList()
    .filter(p => {
      const doc = p.toObject()

      return doc.documentId === queryId
    })

  return list.length ? list[0] : null
}

export async function getBatchPublicationSections(sectionIds) {
  const req = new BatchGetSectionsRequest()
  req.setSectionIdsList(sectionIds)

  const sections = await rpc.batchGetSections(req)
  console.log('getBatchPublicationSections -> sections', sections.toObject())

  return sections
}
