import {Account} from '@app/client'
import {mountWithAccount} from '@app/test/utils'
import {Settings} from '@components/settings'

describe('<Settings />', () => {
  it('Profile form', () => {
    let newAlias = 'demo2'
    let accountId = 'testaccount'
    let profile = {
      alias: 'demo',
      email: 'test@demo.com',
      bio: 'demo bio',
    }
    let updateAccount: any = cy.stub().resolves({
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
    } as Account)

    const {render} = mountWithAccount({
      profile,
      accountId,
    })

    render(<Settings updateAccount={updateAccount} />)
      .get('[data-testid="settings-trigger"]')
      .click()
      .get('[data-testid="input-alias"]')
      .should('have.value', profile.alias)
      .get('[data-testid="input-email"]')
      .should('have.value', profile.email)
      .get('[data-testid="input-bio"]')
      .should('have.value', profile.bio)
      .get('[data-testid="input-alias"]')
      .type('2')
      .get('[data-testid="submit"]')
      .click()
  })
})
