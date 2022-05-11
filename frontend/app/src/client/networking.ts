import type {Device} from './.generated/accounts/v1alpha/accounts'
import type {
  ConnectResponse,
  PeerInfo,
} from './.generated/networking/v1alpha/networking'
import {
  ConnectRequest,
  GetPeerInfoRequest,
  NetworkingClientImpl,
} from './.generated/networking/v1alpha/networking'
import type {GrpcClient} from './grpc-client'
import {createGrpcClient} from './grpc-client'

/**
 *
 * @param peerId
 * @param rpc
 * @returns
 */
export async function listPeerAddrs(
  peerId: string,
  rpc?: GrpcClient,
): Promise<PeerInfo['addrs']> {
  rpc ||= createGrpcClient()
  const request = GetPeerInfoRequest.fromPartial({peerId})
  const info = await new NetworkingClientImpl(rpc).getPeerInfo(request)
  return info.addrs
}

export function connect(
  addrs: Array<string>,
  rpc?: GrpcClient,
): Promise<ConnectResponse> {
  rpc ||= createGrpcClient()
  const request = ConnectRequest.fromPartial({addrs: addrs})
  return new NetworkingClientImpl(rpc).connect(request)
}

export function getPeerInfo(device: Device, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()

  const request = GetPeerInfoRequest.fromPartial({peerId: device.peerId})
  return new NetworkingClientImpl(rpc).getPeerInfo(request)
}
