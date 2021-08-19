const mockClient = require('@mintter/client')

describe('demo render', () => {
  beforeEach(() => {
    cy.stub(mockClient, 'generateSeed').resolves({mnemonic: ['1', '2', '3']})
  })
  it('should render the app', () => {
    cy.visit('http://localhost:3000')
    cy.get('[data-cy=welcome-title]').contains('Welcome to Mintter')
    cy.get('[data-cy=start]').contains('Start').click()
  })
})
