import {mockDocument} from './mock'
import type {GrpcClient} from './grpc-client'

/**
 *
 * @param id
 * @param rpc
 * @returns
 */
export async function getDocument(id: string, rpc?: GrpcClient) {
  console.warn('called mocked function "getDocument"')
  return mockDocument({id})
}
