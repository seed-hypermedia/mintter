import {API_GRAPHQL_ENDPOINT, LIGHTNING_API_URL, Mutation} from '@shm/shared'
import {UseMutationOptions, useMutation, useQuery} from '@tanstack/react-query'
import request, {gql} from 'graphql-request'
import {useEffect} from 'react'
import {useQueryInvalidator} from '../app-context'
import {useMyAccount_deprecated} from './accounts'
import {useWallets} from './payments'
import {queryKeys} from './query-keys'

let exportBuiltInWalletMutation = gql`
  mutation exportBuiltInWallet {
    exportWallet(input: {id: ""}) {
      credentials
    }
  }
`

let insertDefaultWalletMutation = gql`
  mutation insertWallet($credentials: String!) {
    importWallet(input: {name: "Default", url: $credentials}) {
      wallet {
        id
        name
        balanceSats
        isDefault
      }
    }
  }
`

export async function checkWalletAccounts(accountIds: string[]) {
  let url = `${LIGHTNING_API_URL}/v2/check`
  accountIds.forEach((accountId, index) => {
    url += `${index === 0 ? '?' : '&'}user=${accountId}`
  })
  const res = await fetch(url)
  const output = await res.json()
  return output.existing_users || []
}

export function useAccountCheck(accountId?: string) {
  return useQuery({
    queryKey: [queryKeys.LIGHTNING_ACCOUNT_CHECK, accountId],
    queryFn: async () => {
      if (!accountId) return false
      const res = await checkWalletAccounts([accountId])
      return res.includes(accountId)
    },
  })
}

export function useMyAccountCheck() {
  const account = useMyAccount_deprecated()
  const check = useAccountCheck(account?.data?.id)
  return check
}

export function useWalletOptIn(opts?: UseMutationOptions) {
  const wallets = useWallets()
  const invalidate = useQueryInvalidator()
  const walletCheck = useMyAccountCheck()
  const optIn = useMutation({
    mutationFn: async (input) => {
      const exported: Mutation = await request(
        API_GRAPHQL_ENDPOINT,
        exportBuiltInWalletMutation,
      )
      const imported: Mutation = await request(
        API_GRAPHQL_ENDPOINT,
        insertDefaultWalletMutation,
        {credentials: exported.exportWallet.credentials},
      )
      return
    },
    ...opts,
    onSuccess: (result, input, context) => {
      invalidate(['payments'])
      opts?.onSuccess?.(result, input, context)
    },
  })

  useEffect(() => {
    if (walletCheck.data === true && wallets.data?.length === 0) optIn.mutate()
  }, [walletCheck.data, wallets.data])

  return {optIn, wallets, walletCheck}
}
