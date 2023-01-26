import {Publication} from './.generated/documents/v1alpha/documents_pb'
import {
  ContentGraph,
  Publications,
} from './.generated/documents/v1alpha/documents_connectweb'
import {transport} from './client'
import {Transport, createPromiseClient} from '@bufbuild/connect-web'

/**
 *
 * @param documentId
 * @param rpc
 * @returns Promise<void>
 */
export async function deletePublication(
  documentId: string,
  rpc: Transport = transport,
) {
  return await createPromiseClient(Publications, rpc).deletePublication({
    documentId,
  })
}

/**
 *
 * @param pageSize
 * @param pageToken
 * @param view
 * @param rpc
 * @returns
 */
export function listPublications(rpc: Transport = transport) {
  return createPromiseClient(Publications, rpc).listPublications({})
}

/**
 *
 * @param documentId - the publication ID
 * @param version - specific version of a publication (patch)
 * @param rpc - gRPC client
 * @returns Publication (Promise)
 */
export async function getPublication(
  documentId: string,
  version = '',
  rpc: Transport = transport,
): Promise<Publication> {
  return await createPromiseClient(Publications, rpc).getPublication({
    documentId,
    version,
  })
}

export function listCitations(
  documentId: string,
  depth = 0,
  rpc: Transport = transport,
) {
  return createPromiseClient(ContentGraph, rpc).listCitations({
    documentId,
    depth,
  })
}
