import {
  useQuery,
  usePaginatedQuery,
  QueryResult,
  QueryOptions,
} from 'react-query'
import {
  ListDraftsRequest,
  CreateDraftRequest,
  GetDraftRequest,
  Draft,
  PublishDraftRequest,
} from '@mintter/proto/documents_pb'
import {fromSlateToMarkdown} from './parseToMarkdown'
import {documentsClient} from './mintterClient'

export function useDraftsList(page = 0) {
  return usePaginatedQuery(['DraftsList', page], async (key, page) => {
    const req = new ListDraftsRequest()
    req.setPageSize(page)
    return await documentsClient.listDrafts(req)
  })
}

export async function createDraft(cb) {
  const req = new CreateDraftRequest()
  try {
    const resp = await documentsClient.createDraft(req)
    cb(resp)
  } catch (err) {
    console.error('Error on createDraft -> ', err)
    throw err
  }
}

export async function saveDraft({
  documentId,
  title,
  description,
  sections,
}: {
  documentId: string | string[]
  title: string
  description: string
  sections: any[]
}) {
  const request = new Draft()

  if (Array.isArray(documentId)) {
    throw new Error(
      `Impossible render: You are trying to access the editor passing ${
        documentId.length
      } document IDs => ${documentId.map(q => q).join(', ')}`,
    )
  }

  request.setDocumentId(documentId)
  title && request.setTitle(title)
  description && request.setDescription(description)

  if (sections.length > 0) {
    const s = fromSlateToMarkdown(sections)

    request.setSectionsList(s)
  }
  await documentsClient.saveDraft(request)
}

export async function publishDraft(draft) {
  const req = new PublishDraftRequest()
  req.setDocumentId(draft.id)
  try {
    const publication = await documentsClient.publishDraft(req)
    return publication
  } catch (err) {
    console.error(err)
  }
}

export function useFetchDraft(
  id: string | string[],
  options: QueryOptions<Draft>,
): QueryResult<Draft> {
  return useQuery(id && ['Draft', id], getDraftFetcher, {
    refetchOnWindowFocus: false,
    ...options,
  })
}

export async function getDraftFetcher(key, queryId) {
  if (Array.isArray(queryId)) {
    throw new Error(
      `Impossible render: You are trying to access the editor passing ${
        queryId.length
      } document IDs => ${queryId.map(q => q).join(', ')}`,
    )
  }

  const req = new GetDraftRequest()
  req.setDocumentId(queryId)

  return await documentsClient.getDraft(req)
}
