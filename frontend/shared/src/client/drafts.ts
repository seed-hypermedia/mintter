import type {
  Document,
  ListDraftsResponse,
  DocumentChange,
} from './.generated/documents/v1alpha/documents_pb'
import {Drafts} from './.generated/documents/v1alpha/documents_connectweb'
import {transport} from './client'
import {Transport, createPromiseClient} from '@bufbuild/connect-web'

/**
 *
 * @param rpc RPC client
 * @returns {Promise<Document>} A promise to the Draft.
 */
export async function createDraft(
  publicationId = '',
  rpc: Transport = transport,
): Promise<Document> {
  return await createPromiseClient(Drafts, rpc).createDraft({
    existingDocumentId: publicationId,
  })
}

/**
 *
 * @param draftId
 * @param rpc
 */
export function deleteDraft(documentId: string, rpc: Transport = transport) {
  return createPromiseClient(Drafts, rpc).deleteDraft({documentId: documentId})
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
  rpc: Transport = transport,
): Promise<ListDraftsResponse> {
  return createPromiseClient(Drafts, rpc).listDrafts({pageSize, pageToken})
}

/**
 *
 * @param documentId
 * @param rpc
 * @returns
 */
export function publishDraft(documentId: string, rpc: Transport = transport) {
  return createPromiseClient(Drafts, rpc).publishDraft({documentId})
}

/**
 *
 * @param id
 * @param rpc
 * @returns
 */
export async function getDraft(
  documentId: string,
  rpc: Transport = transport,
): Promise<Document> {
  try {
    let draft = await createPromiseClient(Drafts, rpc).getDraft({documentId})
    return draft
  } catch (error) {
    throw new Error(`DetDraft ERROR: ${JSON.stringify(error)}`)
  }
}

export type DocumentChanges = {
  documentId: string
  changes: Array<DocumentChange>
}

export async function updateDraftV2(
  documentChanges: DocumentChanges,
  rpc: Transport = transport,
) {
  try {
    let result = await createPromiseClient(Drafts, rpc).updateDraftV2(
      documentChanges,
    )
    return result
  } catch (error) {
    throw new Error(`UPDATE DRAFT ERROR: ${JSON.stringify(error)}`)
  }
}
