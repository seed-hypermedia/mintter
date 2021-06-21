import {DraftsClientImpl, ListDraftsResponse, PublishDraftRequest} from '../.generated/documents/v1alpha/documents'
import type {Document, DocumentView} from '../.generated/documents/v1alpha/documents'
import {mockDocument} from './mock'
import {createGrpcClient, GrpcClient} from './grpc-client'

/**
 *
 * @param rpc
 * @returns
 */
export async function createDraft(rpc?: GrpcClient) {
  console.warn('called mocked function "createDraft"')
  return mockDocument()
}

/**
 *
 * @param draftId
 * @param rpc
 */
export async function deleteDraft(draftId: string, rpc?: GrpcClient) {
  console.warn('called mocked function "deleteDraft"')
}

/**
 *
 * @param draft
 * @param rpc
 * @returns
 */
export async function updateDraft(draft: Document, rpc?: GrpcClient) {
  console.warn('called mocked function "updateDraft"')
  return document
}

/**
 *
 * @param pageSize
 * @param pageToken
 * @param view
 * @param rpc
 * @returns
 */
export async function listDrafts(pageSize?: number, pageToken?: string, view?: DocumentView, rpc?: GrpcClient) {
  console.warn('called mocked function "getDrafts"')
  return ListDraftsResponse.fromPartial({})
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
  return new DraftsClientImpl(rpc).PublishDraft(request)
}

/**
 *
 * @param id
 * @param rpc
 * @returns
 */
export async function getDraft(id: string, rpc?: GrpcClient): Promise<Document> {
  console.warn('called mocked function "getDraft"')
  return mockDocument({id})
}
