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
