import {DaemonClientImpl, GetInfoRequest} from '../.generated/daemon/v1alpha/daemon'
import {createGrpcClient, GrpcClient} from './grpc-client'

/**
 *
 * @param rpc
 * @returns
 */
export async function getInfo(rpc?: GrpcClient) {
  rpc ||= createGrpcClient()

  const request = GetInfoRequest.fromPartial({})
  return await new DaemonClientImpl(rpc).GetInfo(request)
}
