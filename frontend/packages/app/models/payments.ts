import {
  API_GRAPHQL_ENDPOINT,
  ExportWalletInput,
  LightningWallet,
  Mutation,
  Payments,
  Query,
} from '@shm/shared'
import {
  FetchQueryOptions,
  MutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
import {gql, request} from 'graphql-request'
import appError from '../errors'

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
        let req: Query = await request(API_GRAPHQL_ENDPOINT, getWalletsQuery)
        return req.me.wallets ?? []
      } catch (error) {
        return []
      }
    },
    retry: true,
    retryOnMount: true,
    retryDelay(failureCount, error) {
      return failureCount * 2_000
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
          API_GRAPHQL_ENDPOINT,
          getInvoicesByWalletQuery,
          {
            walletId,
          },
        )
        console.log('🚀 ~ file: payments.ts:95 ~ queryFn: ~ req:', req)
        return req.payments
      } catch (error) {
        appError(`queryInvoicesByWallet error: ${JSON.stringify(error)}`, {
          error,
        })
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

export function mutationExportWallet(
  opts: MutationOptions<{credentials: string}, unknown, ExportWalletInput> = {},
) {
  return {
    mutationFn: async (input: ExportWalletInput) => {
      try {
        let req: Mutation = await request(
          API_GRAPHQL_ENDPOINT,
          exportWalletMutationQuery,
          input,
        )

        return req.exportWallet
      } catch (error) {
        appError(`Error exporting wallet`, {error})
        return {credentials: ''}
      }
    },
    ...opts,
  } satisfies MutationOptions<{credentials: string}, unknown, {id: string}>
}

export function useExportWallet() {
  return useMutation(mutationExportWallet())
}
