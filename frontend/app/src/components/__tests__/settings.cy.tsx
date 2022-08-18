import {Box} from '@components/box'
import {mockIPC} from '@tauri-apps/api/mocks'

beforeEach(() => {
  mockIPC(() => {
    // noop
  })
})

// describe.skip('<Settings />', () => {
//   it('Profile form', () => {
//     let newAlias = 'demo2'
//     let accountId = 'testaccount'
//     let profile = {
//       alias: 'demo',
//       email: 'test@demo.com',
//       bio: 'demo bio',
//     }
//     let updateAccount = cy.stub().resolves({
//       id: accountId,
//       profile: {
//         ...profile,
//         alias: newAlias,
//       },
//       devices: {
//         foo: {
//           peerId: 'foopeerid',
//         },
//       },
//     } as Account)

//     let account = {
//       id: accountId,
//       profile,
//       devices: {
//         foo: {
//           peerId: 'foo',
//         },
//       },
//     }

//     // @ts-ignore
//     cy.mount(<Settings updateAccount={updateAccount} />, {
//       account,
//     })
//       .get('[data-testid="input-alias"]')
//       .should('have.value', account.profile?.alias)
//       .get('[data-testid="input-email"]')
//       .should('have.value', account.profile?.email)
//       .get('[data-testid="input-bio"]')
//       .should('have.value', account.profile?.bio)
//       .get('[data-testid="input-alias"]')
//       .type('2')
//       .get('[data-testid="submit"]')
//       .click()
//   })
// })

it('testing again', () => {
  cy.mount(<Box css={{background: 'red', width: 30, height: 30}} />)
})
