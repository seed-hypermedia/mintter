import type { Account, Profile } from './.generated/accounts/v1alpha/accounts'
import {
  AccountsClientImpl,
  GetAccountRequest,
  ListAccountsRequest
} from './.generated/accounts/v1alpha/accounts'
import {
  DaemonClientImpl,
  GenMnemonicRequest,
  RegisterRequest
} from './.generated/daemon/v1alpha/daemon'
import type { GrpcClient } from './grpc-client'
import { createGrpcClient } from './grpc-client'
/**
 *
 * @param bip39Passphrase
 * @param rpc
 * @returns
 */
export function generateSeed(rpc?: GrpcClient) {
  rpc ||= createGrpcClient()

  const request = GenMnemonicRequest.fromPartial({})
  const response = new DaemonClientImpl(rpc).genMnemonic(request)
  return response
}

/**
 *
 * @param mnemonicList
 * @param bip39Passphrase
 * @param walletPassword
 * @param rpc
 * @returns
 */
export function registerAccount(
  mnemonicList: string[],
  bip39Passphrase?: string,
  walletPassword?: any,
  rpc?: GrpcClient,
) {
  rpc ||= createGrpcClient()

  const request = RegisterRequest.fromPartial({
    mnemonic: mnemonicList,
    bip39Passphrase,
  })

  return new DaemonClientImpl(rpc).register(request)
}

/**
 *
 * @param profile
 * @param rpc
 * @returns
 */
export function updateProfile(profile: Profile, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()

  return new AccountsClientImpl(rpc).updateProfile(profile)
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
  rpc?: GrpcClient,
) {
  rpc ||= createGrpcClient()

  const request = ListAccountsRequest.fromPartial({
    pageSize,
    pageToken,
  })
  return new AccountsClientImpl(rpc).listAccounts(request)
}

/**
 *
 * @param id
 * @param rpc
 * @returns
 */
export async function getAccount(
  id: string,
  rpc?: GrpcClient,
): Promise<Account> {
  rpc ||= createGrpcClient()
  const request = GetAccountRequest.fromPartial({
    id,
  })

  return new AccountsClientImpl(rpc).getAccount(request)
}
