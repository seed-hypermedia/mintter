import {
  Block,
  CreateDraftRequest,
  DeleteDraftRequest,
  DraftsClientImpl,
  GetDraftRequest,
  InlineElement,
  ListDraftsRequest,
  ListDraftsResponse,
  PublishDraftRequest,
  UpdateDraftRequest,
} from '../.generated/documents/v1alpha/documents'
import type {Document, DocumentView} from '../.generated/documents/v1alpha/documents'
import {createId, mockDocument} from '../mocks'
import {createGrpcClient, GrpcClient} from './grpc-client'

/**
 *
 * @param rpc RPC client
 * @returns {Promise<Document>} A promise to the Draft.
 */
export async function createDraft(rpc?: GrpcClient): Promise<Document> {
  rpc ||= createGrpcClient()
  const emptyBlock = Block.fromPartial({id: createId(), elements: [InlineElement.fromPartial({textRun: {text: ''}})]})
  const request = CreateDraftRequest.fromPartial({blocks: [emptyBlock]} as Document)

  const resp = await new DraftsClientImpl(rpc).CreateDraft(request)
  console.log('🚀 ~ file: drafts.ts ~ line 25 ~ createDraft ~ request', resp)
  return resp
}

/**
 *
 * @param draftId
 * @param rpc
 */
export async function deleteDraft(documentId: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  const request = DeleteDraftRequest.fromPartial({documentId})
  const response = await new DraftsClientImpl(rpc).DeleteDraft(request)
}

/**
 *
 * @param draft
 * @param rpc
 * @returns
 */
export async function updateDraft(entry: Document, rpc?: GrpcClient): Promise<Document> {
  rpc ||= createGrpcClient()
  const request = UpdateDraftRequest.fromPartial({document: entry})
  const response = await new DraftsClientImpl(rpc).UpdateDraft(request)
  console.log(JSON.stringify({entry, response}, null, 2))
  return response
}

/**
 *
 * @param pageSize
 * @param pageToken
 * @param view
 * @param rpc
 * @returns
 */
export async function listDrafts(
  pageSize?: number,
  pageToken?: string,
  view?: DocumentView,
  rpc?: GrpcClient,
): Promise<ListDraftsResponse> {
  rpc ||= createGrpcClient()
  const request = ListDraftsRequest.fromPartial({
    pageSize,
    pageToken,
    view,
  })

  return await new DraftsClientImpl(rpc).ListDrafts(request)
}

/**
 *
 * @param documentId
 * @param rpc
 * @returns
 */
export function publishDraft(documentId: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  console.warn('called mocked function "publishDraft"')
  // const request = PublishDraftRequest.fromPartial({documentId})
  // return new DraftsClientImpl(rpc).PublishDraft(request)
}

/**
 *
 * @param id
 * @param rpc
 * @returns
 */
export async function getDraft(documentId: string, rpc?: GrpcClient): Promise<Document> {
  rpc ||= createGrpcClient()
  const request = GetDraftRequest.fromPartial({documentId})
  const response = await new DraftsClientImpl(rpc).GetDraft(request)
  console.log('🚀 ~ response', {response})
  return response
}
