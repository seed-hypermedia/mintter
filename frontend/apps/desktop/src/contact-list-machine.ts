import {QueryClient} from '@tanstack/react-query'
import {Account} from '@mintter/shared'
import {ActorRefFrom, assign, createMachine, spawn} from 'xstate'
import {createContactMachine} from './contact-machine'

export type AccountWithRef = Account & {
  ref: ActorRefFrom<ReturnType<typeof createContactMachine>>
}
type ContactListContext = {
  all: Array<AccountWithRef>
  online: Array<string>
  offline: Array<string>
  errorMessage: string
}

type ContactListEvent =
  | {type: 'CONTACTS.LIST.SUCCESS'; accounts: Array<Account>}
  | {type: 'CONTACTS.LIST.ERROR'; errorMessage: string}
  | {type: 'COMMIT.ONLINE'; accountId: string}
  | {type: 'COMMIT.OFFLINE'; accountId: string}
  | {type: 'REFETCH'}

export const createContactsListMachine = (client: QueryClient) =>
  createMachine(
    {
      id: 'contact-list-machine',
      predictableActionArguments: true,
      tsTypes: {} as import('./contact-list-machine.typegen').Typegen0,
      schema: {
        context: {} as ContactListContext,
        events: {} as ContactListEvent,
      },
      context: {
        all: [],
        offline: [],
        online: [],
        errorMessage: '',
      },
      initial: 'fetching',
      states: {
        fetching: {
          on: {
            'CONTACTS.LIST.SUCCESS': {
              target: 'idle',
              actions: ['assignAllList'],
            },
            'CONTACTS.LIST.ERROR': {
              target: 'error',
              actions: ['assignErrorMessage'],
            },
          },
        },
        idle: {
          on: {
            REFETCH: 'fetching',
            'COMMIT.ONLINE': {
              actions: ['assignContactOnline'],
            },
            'COMMIT.OFFLINE': {
              actions: ['assignContactOffline'],
            },
          },
        },
        error: {
          on: {
            REFETCH: {
              target: 'fetching',
              actions: ['triggerRefetch'],
            },
          },
        },
      },
    },
    {
      actions: {
        assignAllList: assign({
          //@ts-ignore
          all: (_, event) =>
            event.accounts.map((account) => ({
              ...account,
              ref: spawn(
                createContactMachine({account, client}),
                `account-${account.id}`,
              ),
            })),
        }),
        assignContactOnline: assign({
          online: (context, event) => {
            let id = `account-${event.accountId}`
            if (!context.online.includes(id)) {
              return [...context.online, id]
            }
            return context.online
          },
        }),
        assignContactOffline: assign({
          offline: (context, event) => {
            let id = `account-${event.accountId}`
            if (!context.offline.includes(id)) {
              return [...context.offline, id]
            }
            return context.offline
          },
        }),
      },
    },
  )
