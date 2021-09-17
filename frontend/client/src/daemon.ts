import {DaemonClientImpl, GetInfoRequest} from '../.generated/daemon/v1alpha/daemon'
import type {GrpcClient} from './grpc-client'
import {createGrpcClient} from './grpc-client'
/**
 *
 * @param rpc
 * @returns
 */
export async function getInfo(rpc?: GrpcClient) {
  rpc ||= createGrpcClient()

  const request = GetInfoRequest.fromPartial({})
  const response = await new DaemonClientImpl(rpc).getInfo(request)
  return response
}
