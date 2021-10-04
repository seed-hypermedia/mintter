import type {Device} from '../.generated/accounts/v1alpha/accounts'
import type {ConnectResponse, PeerInfo} from '../.generated/networking/v1alpha/networking'
import {
  ConnectRequest,
  GetObjectDiscoveryStatusRequest,
  GetPeerInfoRequest,
  NetworkingClientImpl,
} from '../.generated/networking/v1alpha/networking'
import type {GrpcClient} from './grpc-client'
import {createGrpcClient} from './grpc-client'

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
  Object.entries(devices).map(([, {peerId}]) => {
    peer_id = peerId
  })

  const request = GetPeerInfoRequest.fromPartial({peerId: peer_id})
  return new NetworkingClientImpl(rpc).getPeerInfo(request)
}
