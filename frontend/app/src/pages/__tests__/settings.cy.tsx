import Settings from '@app/pages/settings'
import {createAccount, createTestQueryClient} from '@app/test/utils'

describe('Settings', () => {
  describe('Profile', () => {
    it('should render the profile form', () => {
      const {client, account} = createTestQueryClient()

      let newAccount = createAccount({
        profile: {
          alias: 'new alias',
          bio: 'new bio',
        },
      })

      let updateProfile = cy.stub().resolves(newAccount)

      cy.mount(<Settings updateProfile={updateProfile} />, {
        client,
      })
        .get('[data-testid="input-alias"]')
        .should('have.value', account?.profile?.alias)
        .clear()
        .type(newAccount.profile?.alias)
        .get('[data-testid="input-bio"]')
        .should('have.value', account?.profile?.bio)
        .clear()
        .type(newAccount.profile?.bio)
        .get('[data-testid="submit"]')
        .click()
        .then(() => {
          expect(updateProfile).has.been.calledOnceWith({
            alias: newAccount.profile?.alias,
            bio: newAccount.profile?.bio,
          })
        })
    })
  })

  describe('Account info', () => {
    it('should render all the account info', () => {
      const {client, account} = createTestQueryClient()

      cy.mount(<Settings />, {
        client,
      })
        .get('[data-testid="tab-account"]')
        .click()
        .get('[data-testid="account-id"]')
        .should('have.value', account?.id)
        .get('[data-testid="account-addresses"]')
        .should('have.value', 'foo,bar')
        .get('[data-testid="account-device-list"]')
        .children()
        .should('have.length', 1)
    })

    it.skip('should copy mintter addresses', () => {
      const {client} = createTestQueryClient()

      cy.mount(<Settings />, {
        client,
      })
        .get('[data-testid="tab-account"]')
        .click()
      //   let copyMock = cy.stub()
      //     .get('[data-testid="copy-addrs-button"]')
      //     .click()
      //     .then(() => {
      //       expect(copyMock).callCount(1)
      //       expect(copyMock).to.be.calledWith('foo,bar', true)
      //     })
    })
  })

  describe('Payments', () => {
    /**
     * - it should render all payments info: lnaddress
     * - it should render all available wallets
     * - it should create a new wallet
     * - it should update a wallet as default
     * - it should update wallet alias
     * - it should topup a specific wallet
     * - it should topup the default wallet
     * - it should list invoices
     * - it should filter invoices by state
     */
  })

  describe('App Settings', () => {
    /**
     * - it should reset activity
     * - library position?
     * - theme selection?
     * - editor element styles (font size, font family, variants...)
     * - default page?
     */
  })
})
