import {BACKEND_GRAPHQL_ENDPOINT, Mutation} from '@mintter/shared'
import {UseMutationOptions, useMutation} from '@tanstack/react-query'
import request, {gql} from 'graphql-request'
import {useQueryInvalidator} from '../app-context'

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

export function useWalletOptIn(opts?: UseMutationOptions) {
  const invalidate = useQueryInvalidator()
  return useMutation({
    mutationFn: async (input) => {
      const exported: Mutation = await request(
        BACKEND_GRAPHQL_ENDPOINT,
        exportBuiltInWalletMutation,
      )
      console.log('exported', exported)
      const imported: Mutation = await request(
        BACKEND_GRAPHQL_ENDPOINT,
        insertDefaultWalletMutation,
        {credentials: exported.exportWallet.credentials},
      )
      console.log('imported', imported)
      return
    },
    ...opts,
    onSuccess: (result, input, context) => {
      invalidate(['payments'])
      opts?.onSuccess?.(result, input, context)
    },
  })
}
