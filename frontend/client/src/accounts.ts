import { Account, AccountsClientImpl, GetAccountRequest, ListAccountsRequest, Profile } from '@mintter/api/accounts/v1alpha/accounts'
import { GenSeedRequest, RegisterRequest, DaemonClientImpl } from '@mintter/api/daemon/v1alpha/daemon'
import { rpc } from './rpc-client'

/**
 * 
 * @param aezeedPassphrase 
 * @returns 
 */
export function generateSeed(aezeedPassphrase?: string) {
  const request = GenSeedRequest.fromPartial({})

  return new DaemonClientImpl(rpc).GenSeed(request)
}

/**
 * 
 * @param mnemonicList 
 * @param aezeedPassphrase 
 * @param walletPassword 
 * @returns 
 */
export function registerAccount(mnemonicList: string[], aezeedPassphrase?: string, walletPassword?: any) {
  const request = RegisterRequest.fromPartial({
    mnemonic: mnemonicList,
    aezeedPassphrase
  })

  return new DaemonClientImpl(rpc).Register(request)
}

/**
 * 
 * @param profile 
 * @returns 
 */
export function updateAccount(profile: Profile) {
  return new AccountsClientImpl(rpc).UpdateProfile(profile)
}

/**
 * 
 * @param pageSize 
 * @param pageToken 
 * @returns 
 */
export function listAccounts(pageSize?: number, pageToken?: string) {
  const request = ListAccountsRequest.fromPartial({
    pageSize,
    pageToken
  })
  return new AccountsClientImpl(rpc).ListAccounts(request)
}

/**
 * 
 * @param id 
 * @returns 
 */
export function getAccount(id: string): Promise<Account> {
  const request = GetAccountRequest.fromPartial({
    id
  })

  return new AccountsClientImpl(rpc).GetAccount(request)
}