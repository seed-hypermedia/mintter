import { Account } from '@mintter/api/accounts/v1alpha/accounts'
import { UseQueryOptions, useQuery } from 'react-query'
import { useMemo } from 'react'
import { getAccount } from './lib'

export type UseAccountOptions = UseQueryOptions<Account, unknown, Account>

/**
 * 
 * @param accountId 
 * @param options 
 * @returns 
 */
export function useAccount(accountId: string = '', options: UseAccountOptions = {}) {
  const accountQuery = useQuery(
    ['Account', accountId],
    () => getAccount(accountId),
    options
  )

  const data = useMemo(() => accountQuery.data, [accountQuery.data])

  return {
    ...accountQuery,
    data
  }
}