import {Publication} from '@app/client'
import {client} from '@app/client/client'
import {
  ContentGraphClientImpl,
  DeletePublicationRequest,
  GetPublicationRequest,
  ListCitationsRequest,
  ListPublicationsRequest,
  PublicationsClientImpl,
} from './.generated/documents/v1alpha/documents'
import type {GrpcClient} from './grpc-client'

/**
 *
 * @param documentId
 * @param rpc
 * @returns Promise<void>
 */
export async function deletePublication(
  documentId: string,
  rpc: GrpcClient = client,
) {
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
export function listPublications(rpc: GrpcClient = client) {
  const request = ListPublicationsRequest.fromPartial({})

  return new PublicationsClientImpl(rpc).listPublications(request)
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
  rpc: GrpcClient = client,
): Promise<Publication> {
  console.log("🚀 ~ file: publications.ts:53 ~ rpc", rpc)
  const request = GetPublicationRequest.fromPartial({documentId, version})
  const result = await new PublicationsClientImpl(rpc).getPublication(request)
  console.log("🚀 ~ file: publications.ts:56 ~ result", {request, result})
  return result
}

export function listCitations(
  documentId: string,
  depth = 0,
  rpc: GrpcClient = client,
) {
  const request = ListCitationsRequest.fromPartial({documentId, depth})
  let result = new ContentGraphClientImpl(rpc).listCitations(request)
  return result
}
