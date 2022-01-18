import {DaemonClientImpl, GetInfoRequest} from './.generated/daemon/v1alpha/daemon'
import type {GrpcClient} from './grpc-client'
import {createGrpcClient} from './grpc-client'
/**
 *
 * @param rpc
 * @returns
 */
export function getInfo(rpc?: GrpcClient) {
  rpc ||= createGrpcClient()

  const request = GetInfoRequest.fromPartial({})
  return new DaemonClientImpl(rpc).getInfo(request)
}
