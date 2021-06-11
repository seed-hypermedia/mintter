import {
  DraftsClientImpl,
  ListDraftsResponse,
  PublishDraftRequest,
  GrpcWebImpl,
} from '../.generated/documents/v1alpha/documents'
import type {Document, DocumentView} from '../.generated/documents/v1alpha/documents'
import {mockDocument} from './mock'
import {MINTTER_API_URL_DEFAULT} from '.'

/**
 *
 * @param rpc
 * @returns
 */
export async function createDraft(rpc?: GrpcWebImpl) {
  console.warn('called mocked function "createDraft"')
  return mockDocument()
}

/**
 *
 * @param draftId
 * @param rpc
 */
export async function deleteDraft(draftId: string, rpc?: GrpcWebImpl) {
  console.warn('called mocked function "deleteDraft"')
}

/**
 *
 * @param draft
 * @param rpc
 * @returns
 */
export async function updateDraft(draft: Document, rpc?: GrpcWebImpl) {
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
export async function listDrafts(pageSize?: number, pageToken?: string, view?: DocumentView, rpc?: GrpcWebImpl) {
  console.warn('called mocked function "getDrafts"')
  return ListDraftsResponse.fromPartial({})
}

/**
 *
 * @param documentId
 * @param rpc
 * @returns
 */
export function publishDraft(documentId: string, rpc?: GrpcWebImpl) {
  rpc ||= new GrpcWebImpl(MINTTER_API_URL_DEFAULT, {})
  const request = PublishDraftRequest.fromPartial({documentId})
  return new DraftsClientImpl(rpc).PublishDraft(request)
}

/**
 *
 * @param id
 * @param rpc
 * @returns
 */
export async function getDraft(id: string, rpc?: GrpcWebImpl): Promise<Document> {
  console.warn('called mocked function "getDraft"')
  return mockDocument({id})
}
