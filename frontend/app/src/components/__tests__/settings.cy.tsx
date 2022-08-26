import {Profile} from '@app/client'
import {createTestQueryClient} from '@app/test/utils'
import {PeerAddrs} from '@components/peer-addrs'
import {AccountInfo, ProfileForm} from '@components/settings'

describe('Settings', () => {
  it('Profile', () => {
    /**
     * - it should render account details
     * - it should update alias
     * - it should update email
     * - it should update bio
     */

    let {account} = createTestQueryClient()

    let updateMock = cy.stub()

    let newProfile: Profile = {
      alias: 'new alias',
      email: 'new@email.com',
      bio: 'new bio',
    }

    cy.mount(
      <ProfileForm profile={account?.profile} handleUpdate={updateMock} />,
    )
      .get('[data-testid="input-alias"]')
      .should('have.value', account?.profile?.alias)
      .clear()
      .type(newProfile.alias)
      .get('[data-testid="input-email"]')
      .should('have.value', account?.profile?.email)
      .clear()
      .type(newProfile.email)
      .get('[data-testid="input-bio"]')
      .should('have.value', account?.profile?.bio)
      .clear()
      .type(newProfile.bio)
      .get('[data-testid="submit"]')
      .click()
      .then(() => {
        expect(updateMock).to.has.been.calledOnceWith(newProfile)
      })
  })

  it('Account Info', () => {
    let {account, client} = createTestQueryClient()

    cy.mount(<AccountInfo />, {
      client,
    })
      .get('[data-testid="account-id"]')
      .should('have.value', account?.id)
      .get('[data-testid="account-device-list"]')
      .children()
      .should('have.length', 1)

    let copyMock = cy.stub()

    cy.mount(<PeerAddrs handleCopy={copyMock} />)
      .get('[data-testid="copy-addrs-button"]')
      .click()
      .then(() => {
        expect(copyMock).callCount(1)
        expect(copyMock).to.be.calledWith('foo,bar', true)
      })
  })

  it('Payments', () => {
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

  it('App Settings', () => {
    /**
     * - it should reset activity
     * - library position?
     * - theme selection?
     * - editor element styles (font size, font family, variants...)
     * - default page?
     * - clear bookmarks?
     */
  })
})
