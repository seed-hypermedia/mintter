// import {cleanup, render, screen} from '@testing-library/react'
import {createModel} from '@xstate/test'
import {assign, createMachine} from 'xstate'
import {Info} from '../client'
// import {App} from '../app'
// import {AppProviders} from '../app-providers'

describe('Auth Machine flow (App)', () => {
  let authMachine = createMachine({
    id: 'auth-machine',
    context: {
      accountInfo: undefined as Info | undefined,
    },
    states: {
      checkingAccount: {
        invoke: {
          id: 'authMachine-fetch',
          src: 'fetchInfo',
        },
        on: {
          'REPORT.DEVICE.INFO.PRESENT': {
            target: 'loggedIn',
            actions: [
              assign({
                accountInfo: (_, ev: any) => ev.accountInfo,
              }),
            ],
          },
          'REPORT.DEVICE.INFO.MISSING': {
            target: 'loggedOut',
            actions: [
              assign({
                accountInfo: undefined,
              }),
            ],
          },
        },
      },
      loggedIn: {},
      loggedOut: {},
    },
  })

  const testModel = createModel(authMachine).withEvents({
    'REPORT.DEVICE.INFO.PRESENT': async () => {
      console.log('todo')
    },
    'REPORT.DEVICE.INFO.MISSING': async () => {
      console.log('todo')
    },
  })

  const testPlans = testModel.getSimplePathPlans()

  //   testPlans.forEach((plan, i) => {
  //     describe(plan.description, () => {
  //       afterEach(cleanup)
  //       plan.paths.forEach((path, j) => {
  //         test(path.description, async () => {
  //           render(
  //             <AppProviders>
  //               <App />
  //             </AppProviders>,
  //           )

  //           await path.test(screen)
  //         })
  //       })
  //     })
  //   })
})
