import {getInfo, Info} from '@mintter/client'
import {createModel} from 'xstate/lib/model'

export const authModel = createModel(
  {
    accountInfo: undefined as Info | undefined,
  },
  {
    events: {
      LOGGED_IN: (accountInfo: Info) => ({accountInfo}),
      LOGGED_OUT: () => ({}),
      REPORT_DEVICE_INFO_PRESENT: (accountInfo: Info) => ({accountInfo}),
      REPORT_DEVICE_INFO_MISSING: () => ({}),
    },
  },
)

export const authStateMachine = authModel.createMachine(
  {
    id: 'authStateMachine',
    context: authModel.initialContext,
    initial: 'checkingAccount',
    states: {
      checkingAccount: {
        invoke: {
          id: 'authMachine-fetch',
          src: 'fetchInfo',
        },
        on: {
          REPORT_DEVICE_INFO_PRESENT: {
            target: 'loggedIn',
            actions: [
              authModel.assign({
                accountInfo: (_, ev) => ev.accountInfo,
              }),
            ],
          },
          REPORT_DEVICE_INFO_MISSING: {
            target: 'loggedOut',
            actions: [
              authModel.assign({
                accountInfo: undefined,
              }),
            ],
          },
        },
      },
      loggedIn: {},
      loggedOut: {},
    },
  },
  {
    services: {
      fetchInfo: () => (sendParent) => {
        return getInfo()
          .then(function (accountInfo) {
            sendParent({type: 'REPORT_DEVICE_INFO_PRESENT', accountInfo})
          })
          .catch(function (err) {
            sendParent('REPORT_DEVICE_INFO_MISSING')
          })
      },
    },
  },
)
