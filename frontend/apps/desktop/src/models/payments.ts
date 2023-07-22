import {LightningWallet, Payments, Query} from '@mintter/shared'
import {
  FetchQueryOptions,
  useQuery,
  UseQueryOptions,
} from '@tanstack/react-query'
import {request, gql} from 'graphql-request'

export const GRAPHQL_ENDPOINT = 'http://localhost:55001/graphql'

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
        let req: Query = await request(GRAPHQL_ENDPOINT, getWalletsQuery)
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
          GRAPHQL_ENDPOINT,
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
