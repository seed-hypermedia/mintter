import {AppProviders} from '@app/app-providers'
import {Account, Info, Profile} from '@app/client'
import {queryKeys} from '@app/hooks'
import {mount} from '@cypress/react'
import {ReactNode, useState} from 'react'
import {QueryClient} from 'react-query'

export const memoryLocation =
  (path = '/') =>
  () =>
    useState(path)

export const customHookWithReturn =
  (initialPath = '/') =>
  () => {
    const [path, updatePath] = useState(initialPath)
    const navigate = (path: string) => {
      updatePath(path)
      return 'foo'
    }

    return [path, navigate]
  }

export function mountWithAccount({
  client,
  accountId,
  profile,
}: {
  client?: QueryClient
  accountId?: string
  profile?: Profile
} = {}) {
  accountId ||= 'testaccountid'
  profile ||= {
    alias: 'demo',
    email: 'test@demo.com',
    bio: 'demo bio',
  }

  client ||= new QueryClient({
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

  client.setQueryData<Info>([queryKeys.GET_ACCOUNT_INFO], {
    peerId: 'testpeerid',
    accountId,
    startTime: undefined,
  })

  client.setQueryData<Account>([queryKeys.GET_ACCOUNT, ''], {
    id: accountId,
    profile,
    devices: {
      foo: {
        peerId: 'foopeerid',
      },
    },
  })

  client.invalidateQueries = cy.spy()

  function render(ui: ReactNode) {
    return mount(<AppProviders client={client}>{ui}</AppProviders>)
  }

  return {
    client,
    render,
    accountId,
    profile,
  }
}
