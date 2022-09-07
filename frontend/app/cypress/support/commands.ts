/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

// type PasteOptions {

// }

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      setClipboard(value: string): Chainable<void>
      paste(options: PasteOptions): Chainable<void>
    }
  }
}

import copy from 'copy-text-to-clipboard'

Cypress.Commands.add('setClipboard', setClipboard)
Cypress.Commands.add('paste', {prevSubject: true}, paste)

function setClipboard(value: string) {
  copy(value)
}

/**
 * Simulates a paste event.
 * Modified from https://gist.github.com/nickytonline/bcdef8ef00211b0faf7c7c0e7777aaf6
 *
 * @param subject A jQuery context representing a DOM element.
 * @param pasteOptions Set of options for a simulated paste event.
 * @param pasteOptions.pastePayload Simulated data that is on the clipboard.
 * @param pasteOptions.pasteFormat The format of the simulated paste payload. Default value is 'text'.
 *
 * @returns The subject parameter.
 *
 * @example
 * cy.get('body').paste({
 *   pasteType: 'application/json',
 *   pastePayload: {hello: 'yolo'},
 * });
 */

type PasteOptions = {
  pastePayload: string
  pasteType: 'application/json' | 'text'
}

// eslint-disable-next-line
function paste(subject: any, pasteOptions: PasteOptions) {
  const {pastePayload, pasteType = 'text'} = pasteOptions
  const data =
    pasteType === 'application/json'
      ? JSON.stringify(pastePayload)
      : pastePayload
  // https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer
  const clipboardData = new DataTransfer()
  clipboardData.setData(pasteType, data)
  // https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    dataType: pasteType,
    data,
    clipboardData,
  })
  subject[0].dispatchEvent(pasteEvent)

  return subject
}
