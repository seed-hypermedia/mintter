import {AppProviders} from '@app/app-providers'
import {Account, Info} from '@app/client'
import {queryKeys} from '@app/hooks'
import {Settings} from '@components/settings'
import {mount} from '@cypress/react'
import {QueryClient} from 'react-query'

describe('<Settings />', () => {
  it('Profile form', () => {
    let newAlias = 'demo2'
    let accountId = 'testaccount'
    let profile = {
      alias: 'demo',
      email: 'test@demo.com',
      bio: 'demo bio',
    }

    const client = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          retry: false,
          retryOnMount: false,
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
    let api = {
      updateAccount: cy.stub().resolves({
        id: accountId,
        profile: {
          ...profile,
          alias: newAlias,
        },
        devices: {
          foo: {
            peerId: 'foopeerid',
          },
        },
      } as Account),
    }
    mount(
      <AppProviders client={client}>
        <Settings api={api} />
      </AppProviders>,
    )
      .get('[data-cy="settings-trigger"]')
      .click()
      .get('[data-cy="input-alias"]')
      .should('have.value', profile.alias)
      .get('[data-cy="input-email"]')
      .should('have.value', profile.email)
      .get('[data-cy="input-bio"]')
      .should('have.value', profile.bio)
      .get('[data-cy="input-alias"]')
      .type('2')
      .get('[data-cy="submit"]')
      .click()
  })
})
