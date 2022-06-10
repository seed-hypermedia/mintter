import {queryKeys} from '@app/hooks'
import {error} from '@app/utils/logger'
import {QueryClient} from 'react-query'
import {assign, createMachine} from 'xstate'
import {getInfo, Info} from './client'

type AuthContext = {
  accountInfo?: Info
  retries: number
}

type AuthEvent =
  | {
      type: 'REPORT.DEVICE.INFO.PRESENT'
      accountInfo: Info
    }
  | {
      type: 'REPORT.DEVICE.INFO.MISSING'
    }

export function createAuthService(client: QueryClient) {
  return createMachine(
    {
      id: 'authStateMachine',
      tsTypes: {} as import('./auth-machine.typegen').Typegen0,
      schema: {
        context: {} as AuthContext,
        events: {} as AuthEvent,
      },
      context: {
        accountInfo: undefined,
        retries: 0,
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
            'REPORT.DEVICE.INFO.MISSING': [
              {
                cond: 'shouldRetry',
                target: 'retry',
              },
              {
                target: 'loggedOut',
                actions: 'removeAccountInfo',
              },
            ],
          },
        },
        retry: {
          entry: ['incrementRetry'],
          after: {
            200: {
              target: 'checkingAccount',
            },
          },
        },
        loggedIn: {},
        loggedOut: {},
      },
    },
    {
      services: {
        fetchInfo: () => (sendBack) => {
          client
            .fetchQuery([queryKeys.GET_ACCOUNT_INFO], () => getInfo())
            .then(function (accountInfo) {
              sendBack({type: 'REPORT.DEVICE.INFO.PRESENT', accountInfo})
            })
            .catch(function (err) {
              error('accountInfo: ERROR')
              sendBack('REPORT.DEVICE.INFO.MISSING')
            })
        },
      },
      guards: {
        shouldRetry: (context) => context.retries > 5,
      },
      actions: {
        incrementRetry: assign({
          retries: (context) => context.retries + 1,
        }),
        assignAccountInfo: assign((_, event) => ({
          accountInfo: event.accountInfo,
        })),
        removeAccountInfo: assign({
          accountInfo: (context) => undefined,
        }),
      },
    },
  )
}
