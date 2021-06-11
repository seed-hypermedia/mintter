import type {GrpcWebImpl} from '../.generated/documents/v1alpha/documents'
import {mockDocument} from './mock'

/**
 *
 * @param id
 * @param rpc
 * @returns
 */
export async function getDocument(id: string, rpc?: GrpcWebImpl) {
  console.warn('called mocked function "getDocument"')
  return mockDocument({id})
}
