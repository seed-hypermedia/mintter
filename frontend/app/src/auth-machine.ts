import { Account, getAccount, Profile, updateProfile } from '@app/client';
import { queryKeys } from '@app/hooks';
import { error } from '@app/utils/logger';
import { QueryClient } from 'react-query';
import { assign, createMachine } from 'xstate';
import { getInfo, Info } from './client';

type AuthContext = {
  accountInfo?: Info
  retries: number
  account?: Account
  errorMessage: string
}

type AuthEvent =
  | {
    type: 'REPORT.DEVICE.INFO.PRESENT'
    accountInfo: Info
  }
  | {
    type: 'REPORT.DEVICE.INFO.MISSING'
  } | {
    type: 'UPDATE.PROFILE',
    profile: Profile
  }

type AuthService = {
  fetchAccount: {
    data: Account
  },
  updateProfile: {
    data: Account
  }
}

export function createAuthService(client: QueryClient) {
  return createMachine(
    {
      id: 'authStateMachine',
      tsTypes: {} as import('./auth-machine.typegen').Typegen0,
      schema: {
        context: {} as AuthContext,
        events: {} as AuthEvent,
        services: {} as AuthService
      },
      context: {
        accountInfo: undefined,
        retries: 0,
        account: undefined,
        errorMessage: ''
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
        loggedIn: {
          invoke: {
            src: 'fetchAccount',
            id: 'fetchAccount',
            onDone: {
              actions: ['assignAccount']
            },
            onError: {
              actions: ['assignAccountError']
            }
          },
          initial: 'idle',
          states: {
            idle: {
              on: {
                'UPDATE.PROFILE': {
                  target: 'updating'
                }
              }
            },
            updating: {
              tags: ['pending'],
              invoke: {
                src: 'updateProfile',
                id: 'updateProfile',
                onDone: {
                  target: 'updateSuccess',
                  actions: ['assignAccount']
                },
                onError: {
                  target: 'idle',
                  actions: ['assignErrorFromUpdate']
                }
              }
            },
            updateSuccess: {
              tags: ['pending'],
              after: {
                1000: 'idle'
              }
            }
          }
        },
        loggedOut: {},
      },
    },
    {
      services: {
        fetchInfo: () => function fetchInfoService(sendBack) {
          client
            .fetchQuery([queryKeys.GET_ACCOUNT_INFO], () => getInfo())
            .then(function (accountInfo) {
              sendBack({ type: 'REPORT.DEVICE.INFO.PRESENT', accountInfo })
            })
            .catch(function (err) {
              error('accountInfo: ERROR')
              sendBack('REPORT.DEVICE.INFO.MISSING')
            })
        },
        fetchAccount: function fetchAccountService(context) {
          return client.fetchQuery([queryKeys.GET_ACCOUNT, ''], function accountQuery({ queryKey }) {
            return getAccount(queryKey[1])
          })
        },
        updateProfile: function updateProfileService(_, event) {
          return updateProfile(event.profile)
        }
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
        assignAccount: assign({
          account: (_, event) => {
            return event.data
          }
        }),
        assignAccountError: assign({
          errorMessage: (_, event) => `Fetch Account Error: ${event.data}`
        }),
        assignErrorFromUpdate: assign({
          errorMessage: (_, event) => `Update Profile Error: ${event.data}`
        })
      },
    },
  )
}
