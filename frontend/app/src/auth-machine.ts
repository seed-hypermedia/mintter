import {createModel} from 'xstate/lib/model'
import {Info} from './client'

export const authModel = createModel(
  {
    accountInfo: undefined as Info | undefined,
  },
  {
    events: {
      'REPORT.DEVICE.INFO.PRESENT': (accountInfo: Info) => ({accountInfo}),
      'REPORT.DEVICE.INFO.MISSING': () => ({}),
    },
  },
)

export const authMachine = authModel.createMachine({
  id: 'authStateMachine',
  context: authModel.initialContext,
  initial: 'checkingAccount',
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
            authModel.assign({
              accountInfo: (_, ev) => ev.accountInfo,
            }),
          ],
        },
        'REPORT.DEVICE.INFO.MISSING': {
          target: 'loggedOut',
          actions: [
            authModel.assign({
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
