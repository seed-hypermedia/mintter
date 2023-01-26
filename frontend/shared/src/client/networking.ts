import type {Device} from './.generated/accounts/v1alpha/accounts_pb'
import type {
  ConnectResponse,
  PeerInfo,
} from './.generated/networking/v1alpha/networking_pb'
import {Networking} from './.generated/networking/v1alpha/networking_connectweb'
import {transport} from './client'
import {Transport, createPromiseClient} from '@bufbuild/connect-web'

/**
 *
 * @param peerId
 * @param rpc
 * @returns
 */
export async function listPeerAddrs(
  peerId: string,
  rpc: Transport = transport,
): Promise<PeerInfo['addrs']> {
  const info = await createPromiseClient(Networking, rpc).getPeerInfo({peerId})
  return info.addrs
}

export function connect(
  addrs: Array<string>,
  rpc: Transport = transport,
): Promise<ConnectResponse> {
  return createPromiseClient(Networking, rpc).connect({addrs: addrs})
}

export function getPeerInfo(device: Device, rpc: Transport = transport) {
  return createPromiseClient(Networking, rpc).getPeerInfo({
    peerId: device.peerId,
  })
}
