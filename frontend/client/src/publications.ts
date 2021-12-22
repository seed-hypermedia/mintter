import {
  ContentGraphClientImpl,
  DeletePublicationRequest,
  GetPublicationRequest,
  ListCitationsRequest,
  ListPublicationsRequest,
  Publication,
  PublicationsClientImpl,
} from '../.generated/documents/v1alpha/documents'
import type {GrpcClient} from './grpc-client'
import {createGrpcClient} from './grpc-client'

/**
 *
 * @param documentId
 * @param rpc
 * @returns Promise<void>
 */
export async function deletePublication(documentId: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  const request = DeletePublicationRequest.fromPartial({documentId})
  return await new PublicationsClientImpl(rpc).deletePublication(request)
}

/**
 *
 * @param pageSize
 * @param pageToken
 * @param view
 * @param rpc
 * @returns
 */
export async function listPublications(rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  const request = ListPublicationsRequest.fromPartial({})
  let result = await new PublicationsClientImpl(rpc).listPublications(request)
  console.log('list publications', result)

  return result
}

/**
 *
 * @param documentId - the publication ID
 * @param version - specific version of a publication (patch)
 * @param rpc - gRPC client
 * @returns Publication (Promise)
 */
export async function getPublication(documentId: string, rpc?: GrpcClient): Promise<Publication> {
  console.log('getPublication: docId', documentId)

  rpc ||= createGrpcClient()
  const request = GetPublicationRequest.fromPartial({documentId})
  console.log('getPublication: request', request)
  const result = await new PublicationsClientImpl(rpc).getPublication(request)
  console.log('getPublication: result', result)
  return result
}

export function listCitations(documentId: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  const request = ListCitationsRequest.fromPartial({documentId, depth: 1})
  return new ContentGraphClientImpl(rpc).listCitations(request)
}
