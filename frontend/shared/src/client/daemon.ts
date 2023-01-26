import {Daemon} from './.generated/daemon/v1alpha/daemon_connectweb'
import {transport} from './client'
import {Transport, createPromiseClient} from '@bufbuild/connect-web'

/**
 *
 * @param rpc
 * @returns
 */
export function getInfo(rpc: Transport = transport) {
  return createPromiseClient(Daemon, rpc).getInfo({})
}

/**
 *
 * @param rpc
 * @returns
 */
export function forceSync(rpc: Transport = transport) {
  return createPromiseClient(Daemon, rpc).forceSync({})
}
