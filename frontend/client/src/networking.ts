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
import {client} from './client'
import type {GrpcClient} from './grpc-client'

/**
 *
 * @param peerId
 * @param rpc
 * @returns
 */
export async function listPeerAddrs(
  peerId: string,
  rpc: GrpcClient = client,
): Promise<PeerInfo['addrs']> {
  const request = GetPeerInfoRequest.fromPartial({peerId})
  const info = await new NetworkingClientImpl(rpc).getPeerInfo(request)
  return info.addrs
}

export function connect(
  addrs: Array<string>,
  rpc: GrpcClient = client,
): Promise<ConnectResponse> {
  const request = ConnectRequest.fromPartial({addrs: addrs})
  return new NetworkingClientImpl(rpc).connect(request)
}

export function getPeerInfo(device: Device, rpc: GrpcClient = client) {
  const request = GetPeerInfoRequest.fromPartial({peerId: device.peerId})
  return new NetworkingClientImpl(rpc).getPeerInfo(request)
}
