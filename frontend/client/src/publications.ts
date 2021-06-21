import {
  DeletePublicationRequest,
  ListPublicationsResponse,
  PublicationsClientImpl,
} from '../.generated/documents/v1alpha/documents'
import type {Publication, DocumentView} from '../.generated/documents/v1alpha/documents'
import {mockPublication} from './mock'
import {MINTTER_API_URL_DEFAULT} from '.'
import {createGrpcClient, GrpcClient} from './grpc-client'

/**
 *
 * @param revision
 * @param rpc
 * @returns
 */
export function deletePublication(revision: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient({host: MINTTER_API_URL_DEFAULT})
  const request = DeletePublicationRequest.fromPartial({
    version: revision,
  })
  return new PublicationsClientImpl(rpc).DeletePublication(request)
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
  console.warn('called mocked function "listPublications"')
  return ListPublicationsResponse.fromPartial({
    publications: [mockPublication(), mockPublication(), mockPublication()],
  })
}

/**
 *
 * @param publicationId
 * @param revision
 * @param rpc
 * @returns
 */
export async function getPublication(publicationId: string, revision?: string, rpc?: GrpcClient): Promise<Publication> {
  console.warn('called mocked function "getPublication"')
  return mockPublication()
}
