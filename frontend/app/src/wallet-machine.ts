import {MINTTER_API_URL_DEFAULT} from '@mintter/client'
import {gql, request} from 'graphql-request'
import {EventFrom, Sender, sendParent, spawn} from 'xstate'
import {createModel} from 'xstate/lib/model'

export const MINTTER_GRAPHQL_API_URL = `${MINTTER_API_URL_DEFAULT}/graphql`

export const listModel = createModel(
  {
    walletName: '',
    walletUrl: '',
    wallets: [] as Array<Wallet>,
    errorMessage: null as string | null,
  },
  {
    events: {
      'REPORT.LIST.SUCCESS': (wallets: Array<Wallet>) => ({wallets}),
      'REPORT.LIST.ERROR': (error: any) => ({error}),
      'NEW.WALLET.COMMIT': (wallet: {name: string; url: string}) => ({wallet}),
      'REPORT.WALLET.COMMIT.SUCCESS': () => ({}),
      'REPORT.WALLET.COMMIT.ERROR': (error: any) => ({error}),
      'WALLET.SET.DEFAULT': (walletId: string) => ({walletId}),
      'WALLET.DELETE': (walletId: string) => ({walletId}),
      'WALLET.COMMIT.NAME': (wallet: {name: string; id: string}) => ({wallet}),
      // CANCEL_ADD_WALLET: () => ({}),
      'CAMERA.ACTIVATE': () => ({}),
      'CAMERA.CLOSE': () => ({}),
      'REPORT.CAMERA.SUCCESS': (url: string) => ({url}),
      'NEW.CHANGE.NAME': (value: string) => ({value}),
      'NEW.CHANGE.URL': (value: string) => ({value}),
      'WALLET.COMMIT': () => ({}),
    },
  },
)

export type WalletRef = ReturnType<typeof createWalletRef>

export type Wallet = {
  id: string
  name: string
  url: string
  isDefault: boolean
  balanceSats: number
  ref?: WalletRef
}

type WalletListResponse = {
  me: {
    wallets: Array<Wallet>
  }
}

type CreateWalletResponse = {
  data: {
    wallet: Wallet
  }
}

var addWalletListToContext = listModel.assign(
  {
    wallets: (_, event) => {
      console.log('wallets: ', event.wallets)

      return event.wallets.map((wallet) => {
        console.log('map wallets: ', wallet)

        return {
          ...wallet,
          ref: spawn(createWalletMachine(wallet)),
        }
      })
    },
  },
  'REPORT.LIST.SUCCESS',
)

const fetchWallets =
  (_: any, event: EventFrom<typeof listMachine>) => (sendBack: Sender<EventFrom<typeof listMachine>>) => {
    console.log('fetching....')

    let query = gql`
      {
        me {
          wallets {
            id
            name
            balanceSats
            isDefault
          }
        }
      }
    `
    request<WalletListResponse>(MINTTER_GRAPHQL_API_URL, query)
      .then(({me: {wallets}}) => {
        console.log('wallets: ', wallets)

        sendBack(listModel.events['REPORT.LIST.SUCCESS'](wallets))
      })
      .catch((err: any) => {
        sendBack(listModel.events['REPORT.LIST.ERROR'](err))
      })
  }

export const listMachine = listModel.createMachine(
  {
    context: listModel.initialContext,
    initial: 'loading',
    states: {
      loading: {
        invoke: {
          src: 'fetchWallets',
        },
        on: {
          'REPORT.LIST.SUCCESS': {
            target: 'ready',
            actions: [addWalletListToContext],
          },
          'REPORT.LIST.ERROR': {
            actions: listModel.assign({
              errorMessage: (_, event) => JSON.stringify(event.error),
            }),
          },
        },
      },
      ready: {
        on: {
          'NEW.CHANGE.NAME': {
            actions: listModel.assign({
              walletName: (_, event) => event.value,
            }),
          },
          'NEW.CHANGE.URL': {
            actions: listModel.assign({
              walletUrl: (_, event) => event.value,
            }),
          },
          'NEW.WALLET.COMMIT': 'submitting',
        },
      },
      submitting: {
        entry: listModel.assign({
          errorMessage: null,
        }),
        invoke: {
          src: (context, event) => (sendBack) => {
            let mutation = gql`
              mutation createWallet($input: SetupLndHubWalletInput!) {
                setupLndHubWallet(input: $input) {
                  wallet {
                    id
                    name
                    balanceSats
                    isDefault
                  }
                }
              }
            `

            request<CreateWalletResponse>(MINTTER_GRAPHQL_API_URL, mutation, {
              input: {
                name: context.walletName,
                url: context.walletUrl,
              },
            })
              .then(() => {
                sendBack(listModel.events['REPORT.WALLET.COMMIT.SUCCESS']())
              })
              .catch((err) => {
                sendBack(listModel.events['REPORT.WALLET.COMMIT.ERROR'](err))
              })
          },
        },
        on: {
          'REPORT.WALLET.COMMIT.SUCCESS': {
            target: 'loading',
            actions: [
              listModel.assign({
                walletName: '',
                walletUrl: '',
              }),
            ],
          },
          'REPORT.WALLET.COMMIT.ERROR': {
            actions: listModel.assign({
              errorMessage: (_, event) => event.error,
            }),
          },
        },
      },
    },
    on: {
      'WALLET.COMMIT': 'loading',
    },
  },
  {
    services: {
      fetchWallets,
    },
  },
)

export const walletModel = createModel(
  {
    id: '',
    name: '',
    balanceSats: 0,
    prevName: '',
    isDefault: false,
    errorMessage: '',
  },
  {
    events: {
      EDIT: () => ({}),
      SET_DEFAULT: () => ({}),
      DELETE: () => ({}),
      'REPORT.SUCCESS': () => ({}),
      'REPORT.DELETE.SUCCESS': () => ({}),
      'REPORT.DEFAULT.SUCCESS': () => ({}),
      'REPORT.ERROR': (errorMessage: string) => ({errorMessage}),
    },
  },
)

export function createWalletMachine({id, name, balanceSats, isDefault}: Wallet) {
  return walletModel.createMachine(
    {
      context: {
        id,
        name,
        balanceSats,
        isDefault,
        prevName: name,
        errorMessage: '',
      },
      id: `wallet-${id}`,
      initial: 'idle',
      states: {
        idle: {
          on: {
            SET_DEFAULT: 'settingDefault',
            DELETE: 'deleting',
          },
        },
        editing: {},
        settingDefault: {
          invoke: {
            src: (context) => (sendBack) => {
              let mutation = gql`
                mutation setDefaultWallet($input: SetDefaultWalletInput!) {
                  setDefaultWallet(input: $input) {
                    wallet {
                      id
                    }
                  }
                }
              `
              request(MINTTER_GRAPHQL_API_URL, mutation, {
                input: {id: context.id},
              })
                .then((response) => {
                  console.log('default success', response)
                  sendBack(walletModel.events['REPORT.DEFAULT.SUCCESS']())
                })
                .catch((err) => {
                  sendBack(walletModel.events['REPORT.ERROR'](err))
                })
            },
          },
          on: {
            'REPORT.DEFAULT.SUCCESS': {
              target: 'idle',
              actions: 'commit',
            },
          },
        },
        deleting: {
          invoke: {
            src: (context) => (sendBack) => {
              let mutation = gql`
                mutation deleteWallet($input: DeleteWalletInput!) {
                  deleteWallet(input: $input) {
                    id
                  }
                }
              `
              request(MINTTER_GRAPHQL_API_URL, mutation, {
                input: {id: context.id},
              })
                .then((response) => {
                  console.log('deleted success', response)
                  sendBack(walletModel.events['REPORT.DELETE.SUCCESS']())
                })
                .catch((err) => {
                  sendBack(walletModel.events['REPORT.ERROR'](err))
                })
            },
          },
          on: {
            'REPORT.DELETE.SUCCESS': 'deleted',
            'REPORT.ERROR': {
              actions: 'setError',
            },
          },
        },
        deleted: {
          entry: sendParent(() => listModel.events['WALLET.COMMIT']()),
        },
      },
    },
    {
      actions: {
        commit: sendParent(listModel.events['WALLET.COMMIT']()),
        focusInput: () => {},
      },
    },
  )
}
