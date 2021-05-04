describe('Onboarding Process', () => {
  beforeEach(() => {
    cy.visit('/welcome');
  });
  it('Greeting with `Welcome to Mintter`', () => {
    cy.contains('h1', 'Welcome to Mintter');
  });

  it('should have a start button enabled', () => {
    cy.contains('button', 'Start');
  });

  it('after start, it should show the security pack page', () => {
    cy.contains('button', 'Start').click();
    cy.contains('h1', 'Security Pack');
  });
});
