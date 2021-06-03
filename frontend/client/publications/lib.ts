import { DeletePublicationRequest, DocumentView, ListPublicationsResponse, Publication, PublicationsClientImpl } from "@mintter/api/documents/v1alpha/documents";
import { rpc } from "../rpc-client";
import { mockPublication } from "../mock";

export function deletePublication(revision: string) {
  const request = DeletePublicationRequest.fromPartial({
    version: revision
  })
  return new PublicationsClientImpl(rpc).DeletePublication(request)
}

export async function listPublications(pageSize?: number, pageToken?: string, view?: DocumentView) {
  console.warn('called mocked function "listPublications"');
  return ListPublicationsResponse.fromPartial({
    publications: [
      mockPublication(),
      mockPublication(),
      mockPublication()
    ]
  })
}

export async function getPublication(publicationId: string, revision?: string): Promise<Publication> {
  console.warn('called mocked function "getPublication"');
  return mockPublication()
}