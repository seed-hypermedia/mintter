import {
  ListPublicationsRequest,
  BatchGetSectionsRequest,
} from '@mintter/proto/documents_pb'
import {usePaginatedQuery, useQuery} from 'react-query'
import {documentsClient} from './mintterClient'

export async function publicationsListFetcher(key, page) {
  const req = new ListPublicationsRequest()
  req.setPageSize(page)
  return await documentsClient.listPublications(req)
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
  const publication = await (
    await publicationsListFetcher('PublicationsList', 0)
  )
    .getPublicationsList()
    .find(p => {
      const doc = p.toObject()
      return doc.id === queryId
    })

  return publication
}

export async function getBatchPublicationSections(sectionIds) {
  const req = new BatchGetSectionsRequest()
  req.setSectionIdsList(sectionIds)

  const sections = await documentsClient.batchGetSections(req)
  console.log('getBatchPublicationSections -> sections', sections.toObject())

  return sections
}
