/// <reference types="cypress" />

import {AppProviders} from '@app/app-providers'
import OnboardingPage from '@app/pages/onboarding'
import {mount} from '@cypress/react'
import {createModel} from '@xstate/test'
import {QueryClient} from 'react-query'
import {createMachine} from 'xstate'

let onboardingMachine = createMachine({
  id: 'onboarding-cypress-ct',
  initial: 'welcome',
  states: {
    // loading: {
    //   on: {
    //     NEXT: 'welcome',
    //   },
    // },
    welcome: {
      on: {
        NEXT: 'securityPack',
      },
      meta: {
        test: function () {
          cy.log('META: meta 1')
          cy.get('[data-cy=title]').contains(/welcome to mintter/i)
        },
      },
    },
    securityPack: {
      on: {
        PREV: 'welcome',
        NEXT: 'profileInformation',
      },
      meta: {
        test: function () {
          cy.log('META: meta 2')
          cy.get('[data-cy=title]').contains(/Security Pack/i)
        },
      },
    },
    profileInformation: {
      on: {
        PREV: 'securityPack',
        NEXT: 'complete',
      },
      meta: {
        test: function () {
          cy.log('META: meta 3')
          cy.get('[data-cy=title]').contains(/Profile Information/i)
        },
      },
    },
    complete: {
      type: 'final',
      meta: {
        test: function () {
          cy.log('META: meta 4')
          cy.get('[data-cy=title]').contains(/Thank You/i)
        },
      },
    },
  },
})

const testModel = createModel(onboardingMachine).withEvents({
  NEXT: function () {
    cy.get('[data-cy=next-btn]').click()
  },
  PREV: function () {
    cy.get('[data-cy=prev-btn]').click()
  },
})

context('Feedback App', () => {
  const testPlans = testModel.getSimplePathPlans()
  testPlans.forEach((plan) => {
    describe(plan.description, () => {
      plan.paths.forEach((path) => {
        const mockedClient = new QueryClient()
        mockedClient.setQueryData<Array<string>>(['onboarding', 'mnemonics'], ['foo', 'bar', 'baz'])
        it(path.description, function () {
          console.log('path: ', path)

          mount(
            <AppProviders
              api={{
                getInfo: cy.stub().returns(Promise.resolve(undefined)),
                genSeed: cy.stub().returns(Promise.resolve({mnemonic: ['foo', 'bar', 'baz']})),
              }}
              client={mockedClient}
            >
              <OnboardingPage />
            </AppProviders>,
          ).then(path.test)
        })
      })
    })
  })
})
