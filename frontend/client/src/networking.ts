import {GetPeerInfoRequest, NetworkingClientImpl, GrpcWebImpl} from '../.generated/networking/v1alpha/networking'
import type {PeerInfo} from '../.generated/networking/v1alpha/networking'
import {MINTTER_API_URL_DEFAULT} from '.'

/**
 *
 * @param peerId
 * @param rpc
 * @returns
 */
export async function listPeerAddrs(peerId: string, rpc?: GrpcWebImpl): Promise<PeerInfo['addrs']> {
  rpc ||= new GrpcWebImpl(MINTTER_API_URL_DEFAULT, {})
  const request = GetPeerInfoRequest.fromPartial({peerId})
  const info = await new NetworkingClientImpl(rpc).GetPeerInfo(request)
  return info.addrs
}

/**
 *
 * @deprecated
 */
export function listSuggestedProfiles(pageSize?: number, pageToken?: string, rpc?: GrpcWebImpl) {
  console.log('listSuggestedProfiles: Implement!')
  return {}
}
