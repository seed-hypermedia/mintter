import React from 'react'
import {mount} from '@cypress/react'
import {AppProviders} from '../../app-providers'
// import {SidepanelProvider} from '../sidepanel'
import {MemoryRouter, Route} from 'react-router'
import EditorPage from '../../pages/editor'
import {App} from '../../app'
import {sidepanelMachine, SidepanelProvider} from '../sidepanel'

it('Playground', () => {
  // const generateSeed = cy.stub().resolves({mnemonic: ['1', '2', '3', '4']})
  mount(
    <AppProviders>
      <MemoryRouter initialEntries={['/editor/bahfjrj4iasqoiarappwalncwrplp3nj4i5a3chzzjhherrldp2jywy74fkzyhygs55vq']}>
        <App />
      </MemoryRouter>
    </AppProviders>,
  )
    .get('[data-testid=sidepanel-button]')
    .contains('Open sidepanel')
    .click()
    .contains('Close sidepanel')
    .click()
    .get('[data-testid=editor]')
    .focus()
})
