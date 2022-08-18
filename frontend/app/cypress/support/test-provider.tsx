import {Account, Info} from '@app/client'
import {queryKeys} from '@app/hooks'
import {PropsWithChildren} from 'react'
import {QueryClient, QueryClientProvider} from 'react-query'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: false,
        retryOnMount: false,
        staleTime: Infinity,
      },
    },
  })
}

export function TestProvider({client, account, children}: TestProviderProps) {
  let peerId = 'testipeerID'

  client ||= createTestQueryClient()

  account ||= {
    id: 'testAccountId',
    profile: {
      alias: 'demo',
      email: 'test@demo.com',
      bio: 'demo bio',
    },
    devices: {
      [peerId]: {
        peerId,
      },
    },
  }

  client?.setQueryData<Info>([queryKeys.GET_ACCOUNT_INFO], {
    peerId,
    accountId: account.id,
    startTime: undefined,
  })

  client.setQueryData<Account>([queryKeys.GET_ACCOUNT, ''], account)

  client.invalidateQueries = cy.spy()

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

export type TestProviderProps = PropsWithChildren<CustomMountOptions>

export type CustomMountOptions = {
  client?: QueryClient
  account?: Account
}
