import {Account, ConnectionStatus, getPeerInfo, PeerInfo} from '@mintter/client'
import {queryKeys} from '@app/hooks'
import {QueryClient} from '@tanstack/react-query'
import {assign, createMachine, sendParent} from 'xstate'

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

type ContactServices = {
  fetchListDeviceStatus: {
    data: Array<PeerInfo>
  }
}

export function createContactMachine({
  account,
  client,
}: {
  account: Account
  client: QueryClient
}) {
  return createMachine(
    {
      id: `contact-machine-${account.id}`,
      predictableActionArguments: true,
      tsTypes: {} as import('./contact-machine.typegen').Typegen0,
      schema: {
        context: {} as ContactContext,
        events: {} as AccountEvent,
        services: {} as ContactServices,
      },
      context: {
        account,
        errorMessage: '',
        peers: [],
        status: undefined,
      },
      initial: 'fetching',
      states: {
        fetching: {
          entry: 'clearError',
          invoke: {
            src: 'fetchListDeviceStatus',
            id: 'fetchListDeviceStatus',
            onDone: {
              actions: ['assignData', 'assignConnectionStatus', 'commitStatus'],
              target: 'ready',
            },
            onError: {
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
                return ConnectionStatus.NOT_CONNECTED
              }
            }
          },
        }),
        commitStatus: sendParent((context) => {
          if (context.status == ConnectionStatus.CONNECTED) {
            return {
              type: 'COMMIT.ONLINE',
              accountId: context.account.id,
            }
          }

          return {
            type: 'COMMIT.OFFLINE',
            accountId: context.account.id,
          }
        }),
        assignData: assign({
          peers: (_, event) => event.data,
        }),
        // @ts-ignore
        clearError: assign({
          errorMessage: '',
        }),
        assignError: assign({
          errorMessage: (_, event) => `Contact Error: ${event.data}`,
        }),
      },
      services: {
        fetchListDeviceStatus: (context) => {
          return Promise.all(
            Object.values(context.account.devices).map((device) =>
              client.fetchQuery([queryKeys.GET_PEER_INFO, device.peerId], () =>
                getPeerInfo(device),
              ),
            ),
          )
        },
      },
    },
  )
}
