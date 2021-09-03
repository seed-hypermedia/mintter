import {
  CreateDraftRequest,
  DeleteDraftRequest,
  DraftsClientImpl,
  GetDraftRequest,
  ListDraftsRequest,
  ListDraftsResponse,
  PublishDraftRequest,
  UpdateDraftRequest,
} from '../.generated/documents/v1alpha/documents'
import type {Document} from '../.generated/documents/v1alpha/documents'
import {createGrpcClient} from './grpc-client'
import type {GrpcClient} from './grpc-client'
import {code, createId, document, embed, group, ol, ul, paragraph, statement, text} from '@mintter/mttast-builder'

/**
 *
 * @param rpc RPC client
 * @returns {Promise<Document>} A promise to the Draft.
 */
export async function createDraft(rpc?: GrpcClient): Promise<Document> {
  rpc ||= createGrpcClient()

  const request = CreateDraftRequest.fromPartial({})
  return await new DraftsClientImpl(rpc).createDraft(request)
}

/**
 *
 * @param draftId
 * @param rpc
 */
export function deleteDraft(documentId: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  const request = DeleteDraftRequest.fromPartial({documentId})
  return new DraftsClientImpl(rpc).deleteDraft(request)
}

/**
 *
 * @param draft
 * @param rpc
 * @returns
 */
export function updateDraft(entry: Document, rpc?: GrpcClient): Promise<Document> {
  rpc ||= createGrpcClient()
  const request = UpdateDraftRequest.fromPartial({document: entry})
  return new DraftsClientImpl(rpc).updateDraft({document: entry})
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
export async function getDraft(documentId: string, rpc?: GrpcClient): Promise<Document> {
  rpc ||= createGrpcClient()
  const request = GetDraftRequest.fromPartial({documentId})
  const doc = await new DraftsClientImpl(rpc).getDraft(request)

  return doc
}
