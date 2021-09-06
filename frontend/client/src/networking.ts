import {
  GetPeerInfoRequest,
  NetworkingClientImpl,
  ConnectRequest,
  GetObjectDiscoveryStatusRequest,
} from '../.generated/networking/v1alpha/networking'
import type {PeerInfo, ConnectResponse} from '../.generated/networking/v1alpha/networking'
import {createGrpcClient} from './grpc-client'
import type {GrpcClient} from './grpc-client'
import type {Device} from '../.generated/accounts/v1alpha/accounts'

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

export function connect(addrs: Array<string>, rpc?: GrpcClient): Promise<ConnectResponse> {
  rpc ||= createGrpcClient()
  // console.log({addrs})
  const request = ConnectRequest.fromPartial({addrs: addrs})
  // console.log('🚀 ~ file: networking.ts ~ line 37 ~ connect ~ request', request)
  return new NetworkingClientImpl(rpc).connect(request)
}

export function getConnectionStatus(objectId: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  const request = GetObjectDiscoveryStatusRequest.fromPartial({objectId})
  return new NetworkingClientImpl(rpc).getObjectDiscoveryStatus(request)
}

export function getPeerInfo(devices: {[key: string]: Device}, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  let peer_id: string
  Object.entries(devices).map(([key, {peerId}]) => {
    peer_id = peerId
  })

  const request = GetPeerInfoRequest.fromPartial({peerId: peer_id})
  return new NetworkingClientImpl(rpc).getPeerInfo(request)
}
