import {useEffect} from 'react'
import {Node} from 'slate'
import {
  useQuery,
  useMutation,
  queryCache,
  usePaginatedQuery,
  QueryResult,
  QueryOptions,
} from 'react-query'
import {makeRpcDocumentsClient} from './rpc'
import {
  ListDraftsRequest,
  CreateDraftRequest,
  GetDraftRequest,
  Draft,
} from '@mintter/proto/documents_pb'
import {fromSlateToMarkdown} from './parseToMarkdown'

const rpc = makeRpcDocumentsClient()

export function useDraftsList(page = 0) {
  return usePaginatedQuery(['DraftsList', page], async (key, page) => {
    const req = new ListDraftsRequest()
    req.setPageSize(page)
    return await rpc.listDrafts(req)
  })
}

export async function createDraft(cb) {
  const req = new CreateDraftRequest()
  try {
    const resp = await rpc.createDraft(req)
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
  await rpc.saveDraft(request)
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

  return await rpc.getDraft(req)
}
