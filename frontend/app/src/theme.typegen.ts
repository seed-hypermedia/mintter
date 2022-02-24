// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    assignTheme: 'REPORT.THEME.SUCCESS' | 'CHANGE'
    applyToDom: 'REPORT.THEME.SUCCESS' | 'TOGGLE' | 'CHANGE'
    toggleTheme: 'TOGGLE'
    persist: 'TOGGLE' | 'CHANGE'
  }
  internalEvents: {
    'xstate.init': {type: 'xstate.init'}
  }
  invokeSrcNameMap: {}
  missingImplementations: {
    actions: never
    services: never
    guards: never
    delays: never
  }
  eventsCausingServices: {}
  eventsCausingGuards: {}
  eventsCausingDelays: {}
  matchesStates: 'loading' | 'ready'
  tags: never
}
