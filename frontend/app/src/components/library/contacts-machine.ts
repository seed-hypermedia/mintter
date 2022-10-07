import {Account, listAccounts, ListAccountsResponse} from '@app/client'
import {createContactMachine} from '@components/library/contact-machine'
import {ActorRefFrom, assign, createMachine, spawn} from 'xstate'

export type AccountWithRef = Account & {
  ref: ActorRefFrom<ReturnType<typeof createContactMachine>>
}
type ContactListContext = {
  all: Array<AccountWithRef>
  online: Array<string>
  offline: Array<string>
}

type ContactListEvent =
  | {type: 'COMMIT.ONLINE'; accountId: string}
  | {type: 'COMMIT.OFFLINE'; accountId: string}
  | {type: 'REFETCH'}

type ContactListServices = {
  fetchList: {
    data: ListAccountsResponse
  }
}

export const contactListMachine = createMachine(
  {
    id: 'contact-list-machine',
    tsTypes: {} as import('./contacts-machine.typegen').Typegen0,
    schema: {
      context: {} as ContactListContext,
      events: {} as ContactListEvent,
      services: {} as ContactListServices,
    },
    context: {
      all: [],
      offline: [],
      online: [],
    },
    initial: 'fetching',
    states: {
      fetching: {
        invoke: {
          id: 'fetchList',
          src: 'fetchList',
          onDone: {
            target: 'idle',
            actions: ['assignAllList'],
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
    },
  },
  {
    actions: {
      assignAllList: assign({
        all: (_, event) =>
          event.data.accounts.map((account) => ({
            ...account,
            ref: spawn(createContactMachine(account), `account-${account.id}`),
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
    services: {
      fetchList: () => listAccounts(),
    },
  },
)
