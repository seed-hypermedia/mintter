import {Root} from '..'
import React from 'react'
import {mount} from '@cypress/react'
import {AppProviders} from '../app-providers'
import {SecurityPack} from '../pages/onboarding/security-pack'

it('Playground', () => {
  const generateSeed = cy.stub().resolves({mnemonic: ['1', '2', '3', '4']})
  mount(
    <AppProviders>
      <SecurityPack generateSeed={generateSeed} />
    </AppProviders>,
  )
})
