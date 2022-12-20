import {Publication} from '.'
import {client} from './client'
import {
  ContentGraphClientImpl,
  GetPublicationRequest,
  ListCitationsRequest,
  ListPublicationsRequest,
  PublicationsClientImpl,
} from './.generated/documents/v1alpha/documents'
import type {GrpcClient} from './grpc-client'

/**
 *
 * @param documentId - the publication ID
 * @param version - specific version of a publication (patch)
 * @param localOnly - if we don't want get-remote-publication to be activated
 * @param rpc - gRPC client
 * @returns Publication (Promise)
 */
export async function getPublication(
  documentId: string,
  version = '',
  localOnly = false,
  rpc: GrpcClient = client,
): Promise<Publication> {
  const request = GetPublicationRequest.fromPartial({
    documentId,
    version,
    localOnly,
  })
  const result = await new PublicationsClientImpl(rpc).getPublication(request)

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
