import {
  Account,
  ConnectionStatus,
  getPeerInfo,
  listAccounts,
  PeerInfo,
} from '@app/client'
import {ActorRefFrom, assign, createMachine, spawn} from 'xstate'

type AccountContext = {
  account: Account
  peers: Array<PeerInfo>
  errorMessage: string
  status?: ConnectionStatus
}

type AccountEvent =
  | {
      type: 'REPORT.FETCH.SUCCESS'
      data: Array<PeerInfo>
    }
  | {
      type: 'REPORT.FETCH.ERROR'
      errorMessage: string
    }
  | {
      type: 'RETRY'
    }
export function createAccountMachine(account: Account) {
  return createMachine(
    {
      id: 'Account',
      type: 'parallel',
      tsTypes: {} as import('./accounts-machine.typegen').Typegen0,
      schema: {
        context: {} as AccountContext,
        events: {} as AccountEvent,
      },
      context: {
        account,
        errorMessage: '',
        peers: [],
        status: undefined,
      },
      states: {
        data: {
          initial: 'fetching',
          states: {
            fetching: {
              entry: 'clearError',
              invoke: {
                src: 'fetchListDeviceStatus',
                id: 'fetchListDeviceStatus',
              },
              on: {
                'REPORT.FETCH.SUCCESS': {
                  actions: ['assignData', 'assignConnectionStatus'],
                  target: 'ready',
                },
                'REPORT.FETCH.ERROR': {
                  actions: 'assignError',
                  target: 'errored',
                },
              },
            },
            ready: {
              after: {
                15000: {
                  target: 'fetching',
                },
              },
            },
            errored: {
              on: {
                RETRY: {
                  target: 'fetching',
                },
              },
            },
          },
        },
      },
    },
    {
      actions: {
        assignConnectionStatus: assign({
          status: (_, event) => {
            if (event.data.length == 1) {
              return event.data[0].connectionStatus
            } else {
              let filter = event.data.map(
                ({connectionStatus}) =>
                  connectionStatus == ConnectionStatus.CONNECTED,
              )

              if (filter.length) {
                return ConnectionStatus.CONNECTED
              } else {
                ConnectionStatus.NOT_CONNECTED
              }
            }
          },
        }),
        assignData: assign({
          peers: (_, event) => event.data,
        }),
      },
      services: {
        fetchListDeviceStatus: (context) => (sendBack) => {
          Promise.all(
            Object.values(context.account.devices).map((device) =>
              getPeerInfo(device),
            ),
          )
            .then((data) => {
              sendBack({type: 'REPORT.FETCH.SUCCESS', data})
            })
            .catch((error) => {
              sendBack({
                type: 'REPORT.FETCH.ERROR',
                errorMessage: JSON.stringify(error),
              })
            })
        },
      },
    },
  )
}

type ListAccountsContext = {
  listAccounts: Array<{
    account: Account
    ref: ActorRefFrom<ReturnType<typeof createAccountMachine>>
  }>
  errorMessage: string
}

type ListAccountEvent =
  | {
      type: 'REPORT.FETCH.SUCCESS'
      data: Array<Account>
    }
  | {
      type: 'REPORT.FETCH.ERROR'
      errorMessage: string
    }
  | {
      type: 'RETRY'
    }

export const listAccountsMachine = createMachine(
  {
    id: 'ListAccounts',
    type: 'parallel',
    tsTypes: {} as import('./accounts-machine.typegen').Typegen1,
    context: {
      listAccounts: [],
      errorMessage: '',
    },
    schema: {
      context: {} as ListAccountsContext,
      events: {} as ListAccountEvent,
    },
    states: {
      data: {
        initial: 'fetching',
        states: {
          fetching: {
            entry: 'clearError',
            invoke: {
              src: 'fetchListAccounts',
              id: 'fetchListAccounts',
            },
            on: {
              'REPORT.FETCH.SUCCESS': {
                actions: 'assignData',
                target: 'ready',
              },
              'REPORT.FETCH.ERROR': {
                actions: 'assignError',
                target: 'errored',
              },
            },
          },
          errored: {
            on: {
              RETRY: {
                target: 'fetching',
              },
            },
          },
          ready: {
            after: {
              15000: {
                target: 'fetching',
              },
            },
          },
        },
      },
      idle: {
        initial: 'default',
        states: {
          default: {},
          // TODO: add the connection modal here
        },
      },
    },
  },
  {
    actions: {
      assignData: assign({
        listAccounts: (_, event) =>
          event.data
            .sort((a, b) => {
              return b.id.localeCompare(a.id)
            })
            .map((account) => ({
              account,
              ref: spawn(
                createAccountMachine(account),
                `account-${account.id}`,
              ),
            })),
      }),
      assignError: assign({
        errorMessage: (_, event) => event.errorMessage,
      }),
      clearError: assign({
        errorMessage: (c) => '',
      }),
    },
    services: {
      fetchListAccounts: () => (sendBack) => {
        listAccounts()
          .then((response) => {
            let data = response.accounts || []
            sendBack({type: 'REPORT.FETCH.SUCCESS', data})
          })
          .catch((error) => {
            sendBack({
              type: 'REPORT.FETCH.ERROR',
              errorMessage: JSON.stringify(error),
            })
          })
      },
    },
  },
)
