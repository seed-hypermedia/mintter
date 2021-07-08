import {
  DeletePublicationRequest,
  GetPublicationRequest,
  ListPublicationsRequest,
  ListPublicationsResponse,
  PublicationsClientImpl,
} from '../.generated/documents/v1alpha/documents'
import type {Publication, DocumentView} from '../.generated/documents/v1alpha/documents'
import {mockPublication} from '../mocks'
import {createGrpcClient, GrpcClient} from './grpc-client'

/**
 *
 * @param documentId
 * @param rpc
 * @returns Promise<void>
 */
export async function deletePublication(documentId: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  const request = DeletePublicationRequest.fromPartial({documentId})
  return await new PublicationsClientImpl(rpc).DeletePublication(request)
}

/**
 *
 * @param pageSize
 * @param pageToken
 * @param view
 * @param rpc
 * @returns
 */
export async function listPublications(pageSize?: number, pageToken?: string, view?: DocumentView, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  const request = ListPublicationsRequest.fromPartial({pageSize, pageToken, view})
  return await new PublicationsClientImpl(rpc).ListPublications(request)
}

/**
 *
 * @param documentId - the publication ID
 * @param version - specific version of a publication (patch)
 * @param rpc - gRPC client
 * @returns Publication (Promise)
 */
export async function getPublication(documentId: string, rpc?: GrpcClient): Promise<Publication> {
  rpc ||= createGrpcClient()
  const request = GetPublicationRequest.fromPartial({documentId})
  return await new PublicationsClientImpl(rpc).GetPublication(request)
}
