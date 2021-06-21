import {DaemonClientImpl, GetInfoRequest} from '../.generated/daemon/v1alpha/daemon'
import {MINTTER_API_URL_DEFAULT} from '.'
import {createGrpcClient, GrpcClient} from './grpc-client'

/**
 *
 * @param rpc
 * @returns
 */
export async function getInfo(rpc?: GrpcClient) {
  rpc ||= createGrpcClient({host: MINTTER_API_URL_DEFAULT})

  const request = GetInfoRequest.fromPartial({})
  return new DaemonClientImpl(rpc).GetInfo(request)
}
