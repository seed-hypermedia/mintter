import OnboardingPage from '@app/pages/onboarding'

describe('Onboarding: main component', () => {
  it('should render the titlebar', () => {
    Cypress.env('TAURI_PLATFORM', 'macos')
    cy.mount(<OnboardingPage />)
  })
})
