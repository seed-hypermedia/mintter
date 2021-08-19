// // enables intelligent code completion for Cypress commands
// // https://on.cypress.io/intelligent-code-completion
// /// <reference types="cypress" />

// describe('Example Cypress TodoMVC test', () => {
//   beforeEach(() => {
//     // usually we recommend setting baseUrl in cypress.json
//     // but for simplicity of this example we just use it here
//     // https://on.cypress.io/visit
//     cy.visit('http://todomvc.com/examples/vue/')
//   })

//   it('adds 2 todos', function () {
//     cy.get('.new-todo')
//       .type('learn testing{enter}')
//       .type('be cool{enter}')
//     cy.get('.todo-list li').should('have.length', 2)
//   })

//   it('calls custom commands from support file', () => {
//     cy.customCommand().should('equal', 42)
//   })

//   it('calls into plugins process via cy.task', () => {
//     cy.task('log', 'Hello Node!')
//   })

//   // more examples
//   //
//   // https://github.com/cypress-io/cypress-example-todomvc
//   // https://github.com/cypress-io/cypress-example-kitchensink
//   // https://on.cypress.io/writing-your-first-test
// })

import {generateSeed} from '@mintter/client'

describe('demo render', () => {
  // beforeEach(() => {
  //   cy.stub().resolves({mnemonic: ['1', '2', '3']})
  // })
  it('should render the app', () => {
    cy.visit('http://localhost:3000')
    cy.get('[data-cy=welcome-title]').contains('Welcome to Mintter')
    cy.get('[data-cy=start]').contains('Start').click()
  })
})
