import {
  BACKEND_GRAPHQL_ENDPOINT,
  ExportWalletInput,
  LightningWallet,
  Mutation,
  Payments,
  Query,
} from '@mintter/shared'
import {
  FetchQueryOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
import {gql, request} from 'graphql-request'

const getWalletsQuery = gql`
  query getWallets {
    me {
      wallets {
        id
        isDefault
        name
        balanceSats
      }
    }
  }
`

function queryWallets():
  | UseQueryOptions<Array<LightningWallet>>
  | FetchQueryOptions<Array<LightningWallet>> {
  return {
    queryKey: ['payments', 'wallets'],
    queryFn: async () => {
      try {
        let req: Query = await request(
          BACKEND_GRAPHQL_ENDPOINT,
          getWalletsQuery,
        )
        return req.me.wallets ?? []
      } catch (error) {
        console.error(`queryWallets error: ${JSON.stringify(error)}`)
        return []
      }
    },
  }
}

export function useWallets() {
  return useQuery(queryWallets())
}

const getInvoicesByWalletQuery = gql`
  query getInvoicesByWallet($walletId: ID!) {
    payments(walletID: $walletId) {
      received {
        PaymentHash
        Description
        Destination
        Amount
        Status
        PaymentRequest
        IsPaid
        ExpiresAt
      }
      sent {
        PaymentHash
        Description
        Destination
        Amount
        Status
        PaymentRequest
        IsPaid
        ExpiresAt
      }
    }
  }
`

function queryInvoicesByWallet(
  walletId?: string,
): UseQueryOptions<Payments> | FetchQueryOptions<Payments> {
  return {
    enabled: !!walletId,
    queryKey: ['payments', 'invoices', walletId],
    queryFn: async () => {
      try {
        let req: Query = await request(
          BACKEND_GRAPHQL_ENDPOINT,
          getInvoicesByWalletQuery,
          {
            walletId,
          },
        )
        console.log('🚀 ~ file: payments.ts:95 ~ queryFn: ~ req:', req)
        return req.payments
      } catch (error) {
        console.error(`queryInvoicesByWallet error: ${JSON.stringify(error)}`)
        return {received: [], sent: []}
      }
    },
  }
}

export function useInvoicesBywallet(walletId?: string) {
  return useQuery(queryInvoicesByWallet(walletId))
}

let exportWalletMutationQuery = gql`
  mutation exportWallet($id: ID!) {
    exportWallet(input: {id: $id}) {
      credentials
    }
  }
`

export function mutationExportWallet(opts = {}) {
  return {
    // mutationFn: async (walletId: string) => {
    //   let req: Mutation = await request(
    //     BACKEND_GRAPHQL_ENDPOINT,
    //     exportWalletMutationQuery,
    //     {
    //       id: walletId,
    //     },
    //   )

    //   return req.exportWallet
    // },
    mutationFn: async (input: ExportWalletInput) => {
      try {
        let req: Mutation = await request(
          BACKEND_GRAPHQL_ENDPOINT,
          exportWalletMutationQuery,
          input,
        )

        return req.exportWallet
      } catch (error) {}
    },
    ...opts,
  }
}

export function useExportWallet() {
  return useMutation(mutationExportWallet())
}
