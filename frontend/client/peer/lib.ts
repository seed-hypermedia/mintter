import { GetPeerInfoRequest, NetworkingClientImpl, PeerInfo } from '@mintter/api/networking/v1alpha/networking'
import { rpc } from '../rpc-client'

/**
 * 
 * @param peerId 
 * @returns 
 */
export async function listPeerAddrs(peerId: string): Promise<PeerInfo['addrs']> {
  const request = GetPeerInfoRequest.fromPartial({ peerId })
  const info = await new NetworkingClientImpl(rpc).GetPeerInfo(request)
  return info.addrs
}

/**
 *
 * @deprecated
 */
export function listSuggestedProfiles(pageSize?: number, pageToken?: string) {
  console.log('listSuggestedProfiles: Implement!');
  return {};
}