import type {Account, Profile} from './.generated/accounts/v1alpha/accounts_pb'
import {Accounts} from './.generated/accounts/v1alpha/accounts_connectweb'
import {Daemon} from './.generated/daemon/v1alpha/daemon_connectweb'
import {transport} from './client'
import {Transport, createPromiseClient} from '@bufbuild/connect-web'

/**
 *
 * @param rpc
 * @returns
 */
export function generateMnemonic(rpc: Transport = transport) {
  return createPromiseClient(Daemon, rpc).genMnemonic({})
}

/**
 *
 * @param mnemonicList
 * @param passphrase
 * @param walletPassword
 * @param rpc
 * @returns
 */
export function registerAccount(
  mnemonicList: string[],
  passphrase?: string,
  walletPassword?: string,
  rpc: Transport = transport,
) {
  return createPromiseClient(Daemon, rpc).register({
    mnemonic: mnemonicList,
    passphrase: passphrase,
  })
}

/**
 *
 * @param profile
 * @param rpc
 * @returns
 */
export function updateProfile(profile: Profile, rpc: Transport = transport) {
  return createPromiseClient(Accounts, rpc).updateProfile(profile)
}

/**
 *
 * @param pageSize
 * @param pageToken
 * @param rpc
 * @returns
 */
export function listAccounts(
  pageSize?: number,
  pageToken?: string,
  rpc: Transport = transport,
) {
  return createPromiseClient(Accounts, rpc).listAccounts({
    pageSize: pageSize,
    pageToken: pageToken,
  })
}

/**
 *
 * @param id
 * @param rpc
 * @returns
 */
export async function getAccount(
  id: string,
  rpc: Transport = transport,
): Promise<Account> {
  return createPromiseClient(Accounts, rpc).getAccount({id: id})
}
