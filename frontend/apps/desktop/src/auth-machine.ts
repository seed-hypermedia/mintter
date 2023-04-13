import {accountsClient, daemonClient} from '@app/api-clients'
import {queryKeys} from '@app/hooks/query-keys'
import {Account, Info, Profile} from '@mintter/shared'
import {QueryClient} from '@tanstack/react-query'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {assign, createMachine, MachineOptions} from 'xstate'
import {networkingClient} from './api-clients'

type AuthContext = {
  accountInfo?: Info
  retries: number
  account?: Account
  errorMessage: string
  peerAddrs: Array<string>
}

type AuthEvent =
  | {type: 'ACCOUNT.UPDATE.PROFILE'; profile: Profile}
  | {type: 'RETRY'}
  | {type: 'ACCOUNT.COPY.ADDRESS'}

type AuthService = {
  fetchAccount: {
    data: Account
  }
  updateProfile: {
    data: Account
  }
  fetchInfo: {
    data: Info
  }
  fetchPeerData: {
    data: Array<string>
  }
}

export type AccountMachineOptions = MachineOptions<AuthContext, AuthEvent>

export function createAuthService(client: QueryClient) {
  return createMachine(
    {
      id: 'authStateMachine',
      predictableActionArguments: true,
      tsTypes: {} as import('./auth-machine.typegen').Typegen0,
      schema: {
        context: {} as AuthContext,
        events: {} as AuthEvent,
        services: {} as AuthService,
      },
      context: {
        accountInfo: undefined,
        retries: 0,
        account: undefined,
        errorMessage: '',
        peerAddrs: [],
      },
      initial: 'checkingAccount',
      states: {
        checkingAccount: {
          invoke: {
            id: 'fetchInfo',
            src: 'fetchInfo',
            onDone: {
              target: 'loggedIn',
              actions: ['assignAccountInfo', 'clearRetries', 'clearError'],
            },
            onError: [
              {
                cond: 'shouldRetry',
                target: 'retry',
              },
              {
                target: 'loggedOut',
                actions: [
                  'removeAccountInfo',
                  'clearRetries',
                  'assignRetryError',
                ],
              },
            ],
          },
        },
        retry: {
          entry: ['incrementRetry'],
          after: {
            RETRY_DELAY: {
              target: 'checkingAccount',
            },
          },
        },
        loggedIn: {
          invoke: [
            {
              src: 'fetchAccount',
              id: 'fetchAccount',
              onDone: {
                actions: ['assignAccount'],
              },
              onError: {
                actions: ['assignAccountError'],
              },
            },
            {
              id: 'fetchPeerData',
              src: 'fetchPeerData',
              onDone: {
                actions: ['assignPeerData'],
              },
              onError: {
                actions: ['assignPeerDataError'],
              },
            },
          ],
          initial: 'idle',
          states: {
            idle: {
              on: {
                'ACCOUNT.UPDATE.PROFILE': {
                  target: 'updating',
                },
                'ACCOUNT.COPY.ADDRESS': {
                  actions: ['copyindAddressToClipboard'],
                  target: 'onSuccess',
                },
              },
            },
            updating: {
              tags: ['pending'],
              invoke: {
                src: 'updateProfile',
                id: 'updateProfile',
                onDone: {
                  target: 'onSuccess',
                  actions: ['assignAccount'],
                },
                onError: {
                  target: 'idle',
                  actions: ['assignErrorFromUpdate'],
                },
              },
            },
            onSuccess: {
              tags: ['pending'],
              after: {
                1000: 'idle',
              },
            },
          },
        },
        loggedOut: {},
        errored: {
          on: {
            RETRY: {
              target: 'checkingAccount',
              actions: ['clearRetries', 'clearError'],
            },
          },
        },
      },
    },
    {
      services: {
        fetchInfo: function fetchInfoService() {
          return client.fetchQuery<Info>([queryKeys.GET_ACCOUNT_INFO], () =>
            daemonClient.getInfo({}),
          )
        },
        fetchAccount: function fetchAccountService() {
          return client.fetchQuery(
            [queryKeys.GET_ACCOUNT, ''],
            function accountQuery({queryKey}) {
              return accountsClient.getAccount({id: queryKey[1]})
            },
          )
        },
        updateProfile: function updateProfileService(_, event) {
          return accountsClient.updateProfile(event.profile)
        },
        fetchPeerData: function fetchPeerDataService(context: AuthContext) {
          return client.fetchQuery<Array<string>>({
            queryKey: [queryKeys.GET_PEER_ADDRS, context.accountInfo?.peerId],
            queryFn: async () => {
              if (context.accountInfo) {
                let peerInfo = await networkingClient.getPeerInfo({
                  peerId: context.accountInfo.peerId,
                })

                return peerInfo.addrs
              }

              return []
            },
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
          accountInfo: event.data,
        })),
        /* @ts-ignore */
        removeAccountInfo: assign({
          accountInfo: undefined,
        }),
        assignAccount: assign({
          account: (_, event) => {
            return event.data
          },
        }),
        assignAccountError: assign({
          errorMessage: (_, event) =>
            `[Auth]: Fetch Account Error: ${event.data}`,
        }),
        assignErrorFromUpdate: assign({
          errorMessage: (_, event) =>
            `[Auth]: Update Profile Error: ${event.data}`,
        }),
        assignPeerData: assign({
          peerAddrs: (_, event) => event.data,
        }),
        assignRetryError: assign({
          // eslint-disable-next-line
          errorMessage: (_) =>
            '[Auth]: Limit retries exceeded. Please check yout account',
        }),
        assignPeerDataError: assign({
          // eslint-disable-next-line
          errorMessage: (_) => '[Auth]: Error fetching Peer Address',
        }),
        clearError: assign({
          // eslint-disable-next-line
          errorMessage: (_) => '',
        }),
        clearRetries: assign({
          // eslint-disable-next-line
          retries: (_) => 0,
        }),
        copyindAddressToClipboard: (context) => {
          let value = context.peerAddrs.join(',')
          copyTextToClipboard(value)
        },
      },
      delays: {
        RETRY_DELAY: function getRetryDelay(context) {
          var exponent = context.retries * 2
          return exponent * 200
        },
      },
    },
  )
}
