// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    incrementPos: ''
    incrementIndex: ''
    commit: ''
    printFinal: ''
    resetTickValues: ''
  }
  internalEvents: {
    '': {type: ''}
    'xstate.init': {type: 'xstate.init'}
  }
  invokeSrcNameMap: {}
  missingImplementations: {
    actions: 'resetTickValues'
    services: never
    guards: never
    delays: never
  }
  eventsCausingServices: {}
  eventsCausingGuards: {}
  eventsCausingDelays: {}
  matchesStates: 'tick' | 'finish'
  tags: never
}
