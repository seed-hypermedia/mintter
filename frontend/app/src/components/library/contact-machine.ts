import {Account, ConnectionStatus, getPeerInfo, PeerInfo} from '@app/client'
import {assign, createMachine} from 'xstate'

type ContactContext = {
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

export function createContactMachine(account: Account) {
  return createMachine(
    {
      id: `contact-machine-${account.id}`,
      predictableActionArguments: true,
      tsTypes: {} as import('./contact-machine.typegen').Typegen0,
      schema: {
        context: {} as ContactContext,
        events: {} as AccountEvent,
      },
      context: {
        account,
        errorMessage: '',
        peers: [],
        status: undefined,
      },
      type: 'parallel',
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
                10000: {
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
        // @ts-ignore
        clearError: assign({
          errorMessage: '',
        }),
        assignError: assign({
          errorMessage: (_, event) => `Contact Error: ${event.errorMessage}`,
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
