import {createMachine} from 'xstate'
import {Info} from './client'

type AuthContext = {
  accountInfo?: Info
}

type AuthEvent =
  | {
      type: 'REPORT.DEVICE.INFO.PRESENT'
      accountInfo: Info
    }
  | {
      type: 'REPORT.DEVICE.INFO.MISSING'
    }

export const authMachine = createMachine({
  id: 'authStateMachine',
  tsTypes: {} as import('./auth-machine.typegen').Typegen0,
  schema: {
    context: {} as AuthContext,
    events: {} as AuthEvent,
  },
  context: {
    accountInfo: undefined,
  },
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
          actions: 'assignAccountInfo',
        },
        'REPORT.DEVICE.INFO.MISSING': {
          target: 'loggedOut',
          actions: 'removeAccountInfo',
        },
      },
    },
    loggedIn: {},
    loggedOut: {},
  },
})
