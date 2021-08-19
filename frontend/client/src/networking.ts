import {
  GetPeerInfoRequest,
  NetworkingClientImpl,
  ConnectRequest,
  ConnectResponse,
} from '../.generated/networking/v1alpha/networking'
import type {PeerInfo} from '../.generated/networking/v1alpha/networking'
import {createGrpcClient, GrpcClient} from './grpc-client'

/**
 *
 * @param peerId
 * @param rpc
 * @returns
 */
export async function listPeerAddrs(peerId: string, rpc?: GrpcClient): Promise<PeerInfo['addrs']> {
  rpc ||= createGrpcClient()
  const request = GetPeerInfoRequest.fromPartial({peerId})
  const info = await new NetworkingClientImpl(rpc).getPeerInfo(request)
  console.log('🚀 ~ file: networking.ts ~ line 20 ~ listPeerAddrs ~ info', info)
  return info.addrs
}

/**
 *
 * @deprecated
 */
export function listSuggestedProfiles(pageSize?: number, pageToken?: string, rpc?: GrpcClient) {
  console.log('listSuggestedProfiles: Implement!')
  return {}
}

export async function connect(addrs: Array<string>, rpc?: GrpcClient): Promise<ConnectResponse> {
  rpc ||= createGrpcClient()
  console.log({addrs})
  const request = ConnectRequest.fromPartial({addrs: addrs})
  console.log('🚀 ~ file: networking.ts ~ line 37 ~ connect ~ request', request)
  return await new NetworkingClientImpl(rpc).connect(request)
}
