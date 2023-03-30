import {ProfileInformation} from '@app/pages/onboarding/profile-information'

describe('Onboarding: Profile Information', () => {
  it('should send the input values', () => {
    let next = cy.spy()
    let updateProfile = cy.spy()
    cy.mount(<ProfileInformation next={next} updateProfile={updateProfile} />)
      .get('[data-testid="alias-input"]')
      .type('test-alias')
      .get('[data-testid="bio-input"]')
      .type('test bio')
      .get('[data-testid="next-btn"]')
      .click()
      .then(() => {
        expect(updateProfile).to.be.calledOnceWith({
          alias: 'test-alias',
          bio: 'test bio',
        })
        expect(next).to.be.calledOnce
      })
  })
})
