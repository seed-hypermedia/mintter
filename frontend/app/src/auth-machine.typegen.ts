// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    assignAccountInfo: 'REPORT.DEVICE.INFO.PRESENT'
    removeAccountInfo: 'REPORT.DEVICE.INFO.MISSING'
  }
  internalEvents: {
    'xstate.init': {type: 'xstate.init'}
    'done.invoke.authMachine-fetch': {
      type: 'done.invoke.authMachine-fetch'
      data: unknown
      __tip: 'See the XState TS docs to learn how to strongly type this.'
    }
    'error.platform.authMachine-fetch': {type: 'error.platform.authMachine-fetch'; data: unknown}
  }
  invokeSrcNameMap: {
    fetchInfo: 'done.invoke.authMachine-fetch'
  }
  missingImplementations: {
    actions: 'assignAccountInfo' | 'removeAccountInfo'
    services: 'fetchInfo'
    guards: never
    delays: never
  }
  eventsCausingServices: {
    fetchInfo: 'xstate.init'
  }
  eventsCausingGuards: {}
  eventsCausingDelays: {}
  matchesStates: 'checkingAccount' | 'loggedIn' | 'loggedOut'
  tags: never
}
