// ***********************************************************
// This example support/component.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

import {Router} from '@app/components/router'
import {globalStyles} from '@app/stitches.config'
import {
  createTestQueryClient,
  CustomMountOptions,
  TestProvider,
} from '@app/test/utils'
import {MountOptions, MountReturn} from 'cypress/react'
import {mount} from 'cypress/react18'

// Augment the Cypress namespace to include type definitions for
// your custom command.
// Alternatively, can be defined in cypress/support/component.d.ts
// with a <reference path="./component" /> at the top of your spec.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Mounts a React node
       * @param component React Node to mount
       * @param options Additional options to pass into mount
       */
      mount(
        component: React.ReactNode,
        options?: MountOptions & CustomMountOptions,
      ): Cypress.Chainable<MountReturn>
    }
  }
}

Cypress.Commands.add('mount', (component, options: CustomMountOptions = {}) => {
  let {
    client: customClient,
    account,
    path,
    setLocation = cy.stub(),
    mainMachineOptions,
    ...mountOptions
  } = options
  let client = customClient ?? createTestQueryClient({account}).client
  globalStyles()

  const wrapped = (
    <Router hook={() => [path ?? '/', setLocation]}>
      <TestProvider client={client} mainMachineOptions={mainMachineOptions}>
        {component}
      </TestProvider>
    </Router>
  )
  // const wrapped = <div>{component}</div>

  return mount(wrapped, mountOptions)
})
