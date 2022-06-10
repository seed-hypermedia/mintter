import {debug} from '@app/utils/logger'
import type {Document} from './.generated/documents/v1alpha/documents'
import {
  CreateDraftRequest,
  DeleteDraftRequest,
  DocumentChange,
  DraftsClientImpl,
  GetDraftRequest,
  ListDraftsRequest,
  ListDraftsResponse,
  PublishDraftRequest,
  UpdateDraftRequestV2,
} from './.generated/documents/v1alpha/documents'
import type {GrpcClient} from './grpc-client'
import {createGrpcClient} from './grpc-client'

/**
 *
 * @param rpc RPC client
 * @returns {Promise<Document>} A promise to the Draft.
 */
export async function createDraft(
  publicationId = '',
  rpc?: GrpcClient,
): Promise<Document> {
  rpc ||= createGrpcClient()

  const request = CreateDraftRequest.fromPartial({
    existingDocumentId: publicationId,
  })
  return await new DraftsClientImpl(rpc).createDraft(request)
}

/**
 *
 * @param draftId
 * @param rpc
 */
export function deleteDraft(documentId: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  debug('\n=== deleteDraft', documentId)
  const request = DeleteDraftRequest.fromPartial({documentId})
  return new DraftsClientImpl(rpc).deleteDraft(request)
}

/**
 *
 * @param pageSize
 * @param pageToken
 * @param view
 * @param rpc
 * @returns
 */
export function listDrafts(
  pageSize?: number,
  pageToken?: string,
  view?: any,
  rpc?: GrpcClient,
): Promise<ListDraftsResponse> {
  rpc ||= createGrpcClient()
  const request = ListDraftsRequest.fromPartial({
    pageSize,
    pageToken,
  })

  return new DraftsClientImpl(rpc).listDrafts(request)
}

/**
 *
 * @param documentId
 * @param rpc
 * @returns
 */
export function publishDraft(documentId: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  const request = PublishDraftRequest.fromPartial({documentId})
  return new DraftsClientImpl(rpc).publishDraft(request)
}

/**
 *
 * @param id
 * @param rpc
 * @returns
 */
export async function getDraft(
  documentId: string,
  rpc?: GrpcClient,
): Promise<Document> {
  rpc ||= createGrpcClient()
  const request = GetDraftRequest.fromPartial({documentId})
  const doc = await new DraftsClientImpl(rpc).getDraft(request)
  return doc
}

export type DocumentChanges = {
  documentId: string
  changes: Array<DocumentChange>
}

export async function updateDraftV2(
  documentChanges: DocumentChanges,
  rpc?: GrpcClient,
) {
  rpc ||= createGrpcClient()
  const request = UpdateDraftRequestV2.fromPartial(documentChanges)
  return await new DraftsClientImpl(rpc).updateDraftV2(request)
}
