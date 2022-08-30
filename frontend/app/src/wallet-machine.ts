/* eslint-disable */

import {gql, request} from 'graphql-request'
import {sendParent, spawn} from 'xstate'
import {createModel} from 'xstate/lib/model'
import {
  DeleteWalletPayload,
  LightningWallet,
  Maybe,
  Me,
  MINTTER_API_URL_DEFAULT,
  MutationDeleteWalletArgs,
  MutationSetDefaultWalletArgs,
  MutationSetupLndHubWalletArgs,
  SetDefaultWalletPayload,
  SetupLndHubWalletPayload,
} from './client'

export const MINTTER_GRAPHQL_API_URL = `${MINTTER_API_URL_DEFAULT}/graphql`

export const listModel = createModel(
  {
    walletName: '',
    walletUrl: '',
    wallets: [] as Array<Wallet>,
    errorMessage: null as Maybe<string>,
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
      'REPORT.CAMERA.ERROR': (error: string) => ({error}),
      'NEW.CHANGE.NAME': (value: string) => ({value}),
      'NEW.CHANGE.URL': (value: string) => ({value}),
      'WALLET.COMMIT': () => ({}),
    },
  },
)

export type Wallet = LightningWallet & {
  ref?: any
}

type MePayload = {
  me: Me & {
    wallets: Array<Wallet>
  }
}

type CreateWalletPayload = {
  data: Omit<SetupLndHubWalletPayload, 'wallet'> & {
    wallet: Wallet
  }
}

var addWalletListToContext = listModel.assign(
  {
    wallets: (_, event) =>
      event.wallets.map((wallet) => ({
        ...wallet,
        ref: spawn(createWalletMachine(wallet)),
      })),
  },
  'REPORT.LIST.SUCCESS',
)

export const listMachine = listModel.createMachine(
  {
    context: listModel.initialContext,
    predictableActionArguments: true,
    initial: 'loading',
    states: {
      loading: {
        tags: ['pending'],
        invoke: {
          src: 'fetchWalletList',
          id: 'fetchWalletList',
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
          'CAMERA.ACTIVATE': 'camera',
        },
      },
      submitting: {
        tags: ['pending'],
        entry: listModel.assign({
          errorMessage: null,
        }),
        invoke: {
          src: (context) => (sendBack) => {
            let mutation = gql`
              mutation createWallet($input: SetupLndHubWalletInput!) {
                setupLndHubWallet(input: $input) {
                  wallet {
                    id
                  }
                }
              }
            `

            request<CreateWalletPayload, MutationSetupLndHubWalletArgs>(
              MINTTER_GRAPHQL_API_URL,
              mutation,
              {
                input: {
                  name: context.walletName,
                  url: context.walletUrl,
                },
              },
            )
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
      camera: {
        after: {
          30000: {
            target: 'ready',
            actions: [
              listModel.assign({
                errorMessage: 'Camera Timeout',
              }),
            ],
          },
        },
        on: {
          'REPORT.CAMERA.SUCCESS': {
            target: 'ready',
            actions: [
              listModel.assign({
                walletUrl: (_, event) => event.url,
              }),
            ],
          },
          'REPORT.CAMERA.ERROR': {
            actions: [
              listModel.assign({
                errorMessage: (_, event) => JSON.stringify(event.error),
              }),
            ],
          },
          'CAMERA.CLOSE': 'ready',
        },
      },
    },
    on: {
      'WALLET.COMMIT': 'loading',
    },
  },
  {
    services: {
      fetchWalletList: () => (sendBack) => {
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
        request<MePayload>(MINTTER_GRAPHQL_API_URL, query)
          .then(({me: {wallets}}) => {
            sendBack(listModel.events['REPORT.LIST.SUCCESS'](wallets))
          })
          .catch((err: any) => {
            sendBack(listModel.events['REPORT.LIST.ERROR'](err))
          })
      },
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

export function createWalletMachine({
  id,
  name,
  balanceSats,
  isDefault,
}: Wallet) {
  return walletModel.createMachine(
    {
      predictableActionArguments: true,
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
          tags: ['pending'],
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
              request<SetDefaultWalletPayload, MutationSetDefaultWalletArgs>(
                MINTTER_GRAPHQL_API_URL,
                mutation,
                {
                  input: {id: context.id},
                },
              )
                .then((response: any) => {
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
          tags: ['pending'],
          invoke: {
            src: (context) => (sendBack) => {
              let mutation = gql`
                mutation deleteWallet($input: DeleteWalletInput!) {
                  deleteWallet(input: $input) {
                    id
                  }
                }
              `
              request<DeleteWalletPayload, MutationDeleteWalletArgs>(
                MINTTER_GRAPHQL_API_URL,
                mutation,
                {
                  input: {id: context.id},
                },
              )
                .then(() => {
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
      },
    },
  )
}
