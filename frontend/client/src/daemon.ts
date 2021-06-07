import { DaemonClientImpl, GetInfoRequest, GrpcWebImpl } from '@mintter/api/daemon/v1alpha/daemon'
import { MINTTER_API_URL_DEFAULT } from '.'

/**
 * 
 * @param rpc 
 * @returns 
 */
export async function getInfo(rpc?: GrpcWebImpl) {
  rpc ||= new GrpcWebImpl(MINTTER_API_URL_DEFAULT, {})
  const request = GetInfoRequest.fromPartial({})
  return new DaemonClientImpl(rpc).GetInfo(request)
}