import * as mock from '../mocks'
import {
  Drafts,
  DraftsClientImpl,
  Document,
  CreateDraftRequest,
  GetDraftRequest,
} from '../.generated/documents/v1alpha/documents'

import {GrpcClient, createGrpcClient} from './grpc-client'

/**
 *
 * @param id
 * @param rpc
 * @returns
 */
export async function getDocument(id: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  console.warn('called mocked function "getDocument"')
  return {}
}
