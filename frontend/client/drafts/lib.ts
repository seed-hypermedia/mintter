import { Document, DocumentView, DraftsClientImpl, ListDraftsResponse, PublishDraftRequest } from '@mintter/api/documents/v1alpha/documents'
import { mockDocument } from '../mock'
import { rpc } from '../rpc-client'

/**
 * 
 * @returns 
 */
export async function createDraft() {
  console.warn('called mocked function "createDraft"');
  return mockDocument()
}

/**
 * 
 * @param draftId 
 */
export async function deleteDraft(draftId: string) {
  console.warn('called mocked function "deleteDraft"');
}

/**
 * 
 * @param draft 
 * @returns 
 */
export async function updateDraft(draft: Document) {
  console.warn('called mocked function "updateDraft"');
  return document
}

/**
 * 
 * @param pageSize 
 * @param pageToken 
 * @param view 
 * @returns 
 */
export async function listDrafts(pageSize?: number, pageToken?: string, view?: DocumentView) {
  console.warn('called mocked function "getDrafts"');
  return ListDraftsResponse.fromPartial({})
}

/**
 * 
 * @param documentId 
 * @returns 
 */
export function publishDraft(documentId: string) {
  const request = PublishDraftRequest.fromPartial({ documentId })
  return new DraftsClientImpl(rpc).PublishDraft(request)
}

/**
 * 
 * @param id 
 * @returns 
 */
export async function getDraft(id: string): Promise<Document> {
  console.warn('called mocked function "getDraft"');
  return mockDocument({ id })
}