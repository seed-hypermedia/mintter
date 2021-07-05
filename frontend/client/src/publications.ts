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
 * @param revision
 * @param rpc
 * @returns
 */
export function deletePublication(version: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  console.warn('deletePublication(): not working now!')
  // const request = DeletePublicationRequest.fromPartial({
  //   version,
  // })
  // return new PublicationsClientImpl(rpc).DeletePublication(request)
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
  const response = await new PublicationsClientImpl(rpc).ListPublications(request)
  console.log('🚀 ~ listPublications ~ ', response)
  return response
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
  const response = await new PublicationsClientImpl(rpc).GetPublication(request)
  console.log(`🚀 ~ getPublication (${documentId}) ~ `, response)
  return response
}
