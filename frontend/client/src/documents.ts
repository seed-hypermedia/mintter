import {createGrpcClient} from './grpc-client'
import type { GrpcClient } from './grpc-client'

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
